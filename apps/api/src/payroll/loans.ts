import { sql } from 'drizzle-orm'
import type { Db, Tx } from '../db'
import { DomainError } from '../ledger/deciders'
import { handleTx } from '../ledger/handler'
import { nextNumber, period } from '../sales/service'
import { fmtDate } from '../reports/general-ledger'
import { formatIdr } from '../reports/trial-balance'

// Pinjaman Karyawan (fixtures/employee-loan-t17.json). Only a loan without installment schedule or disbursement is verified:
// shortcut: no installment schedule, installments or settlement yet; add them when those reports are captured with a disbursed loan.
// Pencairan Pinjaman (P4.2) posts the loan's journal; the loan reports still read the loan alone.

export async function upsertEmployee(db: Db, e: { no: string; name: string; taxStatus?: string }) {
  await db.execute(sql`INSERT INTO employees (no, name, tax_status) VALUES (${e.no}, ${e.name}, ${e.taxStatus ?? 'TK0'})
    ON CONFLICT (no) DO UPDATE SET name = EXCLUDED.name, tax_status = EXCLUDED.tax_status`)
}
type LoanInput = { number?: string; employee: string; date: string; amount: number; interestRate?: number; description?: string; receivableAccount?: string; penaltyAccount?: string }
/** Pinjaman Karyawan: no journal (Accurate posts on Pencairan Pinjaman). Number omitted → EPL.yyyy.mm.nnnnn. */
export async function createEmployeeLoan(db: Db | Tx, l: LoanInput) {
  if (!l.employee) throw new DomainError('Karyawan harus diisi') // Accurate's text (docs/parity/buku-besar/pinjaman-karyawan)
  return db.transaction(async tx => {
    await assertNoUnpaidLoan(tx, l.employee)
    const number = l.number ?? await nextNumber(tx, `EPL.${period(l.date)}`)
    await tx.execute(sql`INSERT INTO employee_loans (number, employee_no, date, amount, interest_rate, description, receivable_account, penalty_account)
      VALUES (${number}, ${l.employee}, ${l.date}, ${Math.round(l.amount * 100)}, ${l.interestRate ?? 0}, ${l.description ?? ''}, ${l.receivableAccount ?? null}, ${l.penaltyAccount ?? null})`)
    return { number }
  })
}

/** Accurate refuses to save a loan while its employee has a loan with a balance left, the loan being edited included (verified on the form's own Simpan, ADR-0045). */
async function assertNoUnpaidLoan(tx: Tx, employee: string) {
  const [r] = await tx.execute(sql`SELECT e.name FROM employee_loans l JOIN employees e ON e.no = l.employee_no WHERE l.employee_no = ${employee}
    AND l.amount > COALESCE((SELECT sum(p.amount) FROM employee_loan_payments p WHERE p.loan_number = l.number), 0) LIMIT 1`)
  if (r) throw new DomainError(`Karyawan ${r.name} Masih Memiliki Pinjaman Yang Belum Lunas`)
}
const disbursed = async (tx: Tx, loan: string) => (await tx.execute(sql`SELECT 1 FROM employee_loan_disbursements WHERE loan_number = ${loan} LIMIT 1`)).length > 0

/** A disbursed loan is read-only in Accurate; any other loan with a balance refuses its own edit (see assertNoUnpaidLoan), so an edit only passes for a fully paid loan. */
export async function editEmployeeLoan(db: Db, number: string, l: LoanInput) {
  if (!l.employee) throw new DomainError('Karyawan harus diisi')
  return db.transaction(async tx => {
    if (await disbursed(tx, number)) throw new DomainError(`Pinjaman Karyawan ${number} sudah dicairkan`)
    await assertNoUnpaidLoan(tx, l.employee)
    const [r] = await tx.execute(sql`UPDATE employee_loans SET employee_no = ${l.employee}, date = ${l.date}, amount = ${Math.round(l.amount * 100)}, interest_rate = ${l.interestRate ?? 0},
      description = ${l.description ?? ''}, receivable_account = ${l.receivableAccount ?? null}, penalty_account = ${l.penaltyAccount ?? null} WHERE number = ${number} RETURNING number`)
    if (!r) throw new DomainError(`Pinjaman Karyawan ${number} tidak ditemukan`)
    return { number }
  })
}

export async function deleteEmployeeLoan(db: Db, number: string) {
  return db.transaction(async tx => {
    if (await disbursed(tx, number)) throw new DomainError('Tidak dapat menghapus Pinjaman Karyawan karena telah digunakan di Pencairan Pinjaman') // Accurate's text
    if ((await tx.execute(sql`SELECT 1 FROM employee_loan_payments WHERE loan_number = ${number} LIMIT 1`)).length) throw new DomainError('Tidak dapat menghapus Pinjaman Karyawan karena telah digunakan di Pelunasan Pinjaman')
    const [r] = await tx.execute(sql`DELETE FROM employee_loans WHERE number = ${number} RETURNING number`)
    if (!r) throw new DomainError(`Pinjaman Karyawan ${number} tidak ditemukan`)
    return { number }
  })
}

type DisbursementInput = { idempotencyKey: string; number?: string; loan?: string; bank: string; date: string; description?: string }
/** Pencairan Pinjaman: pays the whole loan out, Dr the loan's Piutang Karyawan / Cr the bank; number ELD.yyyy.mm.nnnnn. */
export async function createLoanDisbursement(db: Db | Tx, d: DisbursementInput) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${d.idempotencyKey}`)
    if (done) return done.result as { number: string }
    if (!d.loan) throw new DomainError('Nomor Pinjaman harus diisi') // Accurate's text (docs/parity/kas-bank/pencairan-pinjaman)
    const [loan] = await tx.execute(sql`SELECT amount, receivable_account FROM employee_loans WHERE number = ${d.loan} FOR UPDATE`)
    if (!loan) throw new DomainError(`Pinjaman Karyawan ${d.loan} tidak ditemukan`)
    if (!loan.receivable_account) throw new DomainError('Piutang Karyawan harus diisi')
    if (await disbursed(tx, d.loan)) throw new DomainError(`Pinjaman Karyawan ${d.loan} sudah dicairkan`)
    const [bank] = await tx.execute(sql`SELECT type FROM accounts WHERE no = ${d.bank}`)
    if (bank?.type !== 'CASH_BANK') throw new DomainError(`${d.bank} bukan akun Kas & Bank`)
    const number = d.number ?? await nextNumber(tx, `ELD.${period(d.date)}`)
    const amount = Number(loan.amount), journalId = crypto.randomUUID(), rp = (amount / 100).toFixed(2)
    await handleTx(tx, { type: 'PostJournal', idempotencyKey: `${d.idempotencyKey}:journal`, journalId, number, sourceType: 'ELD', date: d.date, description: d.description ?? '',
      lines: [{ account: loan.receivable_account as string, side: 'DEBIT', amount: rp }, { account: d.bank, side: 'CREDIT', amount: rp }] })
    await tx.execute(sql`INSERT INTO employee_loan_disbursements VALUES (${number}, ${d.loan}, ${d.bank}, ${d.date}, ${amount}, ${d.description ?? ''}, ${journalId})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${d.idempotencyKey}, 'CreateLoanDisbursement', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

async function removeLoanDisbursement(tx: Tx, number: string, idempotencyKey: string) {
  const [d] = await tx.execute(sql`DELETE FROM employee_loan_disbursements WHERE number = ${number} RETURNING journal_id`)
  if (!d) throw new DomainError(`Pencairan Pinjaman ${number} tidak ditemukan`)
  await handleTx(tx, { type: 'DeleteJournal', idempotencyKey: `${idempotencyKey}:unpost`, journalId: d.journal_id as string })
}

export async function deleteLoanDisbursement(db: Db, number: string, idempotencyKey: string) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${idempotencyKey}`)
    if (done) return done.result as { number: string }
    await removeLoanDisbursement(tx, number, idempotencyKey)
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${idempotencyKey}, 'DeleteLoanDisbursement', ${JSON.stringify({ number })}::jsonb)`)
    return { number }
  })
}

/** Edited in place under the same number. */
export async function editLoanDisbursement(db: Db, number: string, d: DisbursementInput) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${d.idempotencyKey}`)
    if (done) return done.result as { number: string }
    await removeLoanDisbursement(tx, number, d.idempotencyKey)
    return createLoanDisbursement(tx, { ...d, number: d.number ?? number })
  })
}

type PaymentKind = 'INSTALLMENT' | 'SETTLEMENT'
type PaymentInput = { idempotencyKey: string; number?: string; loan?: string; bank: string; date: string; description?: string; amount?: number }
const PAYMENT = { SETTLEMENT: { prefix: 'ELS', source: 'ELS', cmd: 'LoanSettlement', label: 'Pelunasan Pinjaman' }, INSTALLMENT: { prefix: 'ELI', source: 'ELI', cmd: 'LoanInstallment', label: 'Pembayaran Angsuran' } } as const

/** Pelunasan Pinjaman pays the balance of a disbursed loan; Pembayaran Angsuran pays `amount` of it. Dr the bank / Cr the loan's Piutang Karyawan. */
async function createLoanPayment(db: Db | Tx, kind: PaymentKind, d: PaymentInput) {
  const k = PAYMENT[kind]
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${d.idempotencyKey}`)
    if (done) return done.result as { number: string }
    if (!d.loan) throw new DomainError('Nomor Pinjaman harus diisi')
    const [loan] = await tx.execute(sql`SELECT amount, receivable_account, penalty_account FROM employee_loans WHERE number = ${d.loan} FOR UPDATE`)
    if (!loan) throw new DomainError(`Pinjaman Karyawan ${d.loan} tidak ditemukan`)
    if (!(await disbursed(tx, d.loan))) throw new DomainError(`Pinjaman Karyawan ${d.loan} belum dicairkan`)
    const [bank] = await tx.execute(sql`SELECT type FROM accounts WHERE no = ${d.bank}`)
    if (bank?.type !== 'CASH_BANK') throw new DomainError(`${d.bank} bukan akun Kas & Bank`)
    const [paid] = await tx.execute(sql`SELECT COALESCE(sum(amount), 0) AS n FROM employee_loan_payments WHERE loan_number = ${d.loan}`)
    const left = Number(loan.amount) - Number(paid.n)
    // Pelunasan: `amount` is the cash paid (default 0); the rest of the balance goes to the loan's penalty income account (Accurate's journal, ADR-0045).
    const cash = Math.round((d.amount ?? 0) * 100)
    const amount = kind === 'SETTLEMENT' ? left : cash
    if (amount <= 0 || amount > left || cash > left) throw new DomainError(kind === 'SETTLEMENT' ? `Pinjaman Karyawan ${d.loan} sudah lunas` : 'Jumlah angsuran tidak valid')
    if (kind === 'SETTLEMENT' && left > cash && !loan.penalty_account) throw new DomainError('Akun Pendapatan Denda harus diisi')
    const number = d.number ?? await nextNumber(tx, `${k.prefix}.${period(d.date)}`)
    const journalId = crypto.randomUUID(), rp = (n: number) => (n / 100).toFixed(2)
    const bankLine = { account: d.bank, side: 'DEBIT' as const, amount: rp(kind === 'SETTLEMENT' ? cash : amount) }
    const penaltyLine = { account: loan.penalty_account as string, side: 'DEBIT' as const, amount: rp(left - cash) }
    // Accurate's order: bank, receivable credit, penalty income (its zero-amount bank line is not posted, ADR-0045)
    const debits = [bankLine].filter(l => Number(l.amount) > 0)
    await handleTx(tx, { type: 'PostJournal', idempotencyKey: `${d.idempotencyKey}:journal`, journalId, number, sourceType: k.source, date: d.date, description: d.description ?? `${k.label} ${d.loan}`,
      lines: [...debits, { account: loan.receivable_account as string, side: 'CREDIT', amount: rp(amount) }, ...(kind === 'SETTLEMENT' && left > cash ? [penaltyLine] : [])] })
    await tx.execute(sql`INSERT INTO employee_loan_payments VALUES (${number}, ${d.loan}, ${kind}, ${d.bank}, ${d.date}, ${amount}, ${d.description ?? ''}, ${journalId})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${d.idempotencyKey}, ${'Create' + k.cmd}, ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}
async function removeLoanPayment(tx: Tx, kind: PaymentKind, number: string, idempotencyKey: string) {
  const [d] = await tx.execute(sql`DELETE FROM employee_loan_payments WHERE number = ${number} AND kind = ${kind} RETURNING journal_id`)
  if (!d) throw new DomainError(`${PAYMENT[kind].label} ${number} tidak ditemukan`)
  await handleTx(tx, { type: 'DeleteJournal', idempotencyKey: `${idempotencyKey}:unpost`, journalId: d.journal_id as string })
}
async function deleteLoanPayment(db: Db, kind: PaymentKind, number: string, idempotencyKey: string) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${idempotencyKey}`)
    if (done) return done.result as { number: string }
    await removeLoanPayment(tx, kind, number, idempotencyKey)
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${idempotencyKey}, ${'Delete' + PAYMENT[kind].cmd}, ${JSON.stringify({ number })}::jsonb)`)
    return { number }
  })
}
async function editLoanPayment(db: Db, kind: PaymentKind, number: string, d: PaymentInput) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${d.idempotencyKey}`)
    if (done) return done.result as { number: string }
    await removeLoanPayment(tx, kind, number, d.idempotencyKey)
    return createLoanPayment(tx, kind, { ...d, number: d.number ?? number })
  })
}
/** Accurate refuses a settlement edit that changes the cash paid or the date ("Sisa Angsuran & Penalty tidak boleh kurang dari Jumlah Pokok Dibayarkan", seen for both, ADR-0045). */
async function editSettlement(db: Db, n: string, d: PaymentInput) {
  const [cur] = await db.execute(sql`SELECT to_char(date,'YYYY-MM-DD') AS date FROM employee_loan_payments WHERE number = ${n} AND kind = 'SETTLEMENT'`)
  if (!cur) throw new DomainError(`Pelunasan Pinjaman ${n} tidak ditemukan`)
  if ((d.amount ?? 0) > 0 || d.date !== cur.date) throw new DomainError('Sisa Angsuran & Penalty tidak boleh kurang dari Jumlah Pokok Dibayarkan')
  return editLoanPayment(db, 'SETTLEMENT', n, d)
}
export const createLoanSettlement = (db: Db | Tx, d: PaymentInput) => createLoanPayment(db, 'SETTLEMENT', d)
export const editLoanSettlement = editSettlement
export const deleteLoanSettlement = (db: Db, n: string, key: string) => deleteLoanPayment(db, 'SETTLEMENT', n, key)
export const createLoanInstallment = (db: Db | Tx, d: PaymentInput) => createLoanPayment(db, 'INSTALLMENT', d)
export const editLoanInstallment = (db: Db, n: string, d: PaymentInput) => editLoanPayment(db, 'INSTALLMENT', n, d)
export const deleteLoanInstallment = (db: Db, n: string, key: string) => deleteLoanPayment(db, 'INSTALLMENT', n, key)

type Loan = { number: string; date: string; employee: string; name: string; amount: number; rate: number }
export async function loadLoans(db: Db): Promise<Loan[]> {
  return (await db.execute(sql`SELECT l.number, to_char(l.date,'YYYY-MM-DD') AS date, l.employee_no, e.name, l.amount, l.interest_rate FROM employee_loans l JOIN employees e ON e.no = l.employee_no ORDER BY l.date, l.number`))
    .map(r => ({ number: r.number as string, date: r.date as string, employee: r.employee_no as string, name: r.name as string, amount: Number(r.amount), rate: Number(r.interest_rate) }))
}
const rateText = (r: number) => `${r.toFixed(1)}%`

/** Daftar Piutang Karyawan: per branch; amount columns stay empty while a loan has no installment schedule. */
export const loanList = (ls: Loan[]) => [['Nomor #', 'Tanggal', 'Nama Karyawan', 'Angsuran Pokok', 'Angsuran Bunga', 'Total Angsuran', 'Suku Bunga', 'Bunga', 'Terbayar', 'Sisa Angsuran'],
  ['Kantor Pusat'], ...ls.map(l => [l.number, fmtDate(l.date), l.name, l.rate ? 'Bunga' : 'Tanpa Bunga', rateText(l.rate)])]

/** Angsuran Pinjaman per Karyawan: header only while there is no schedule. */
export const loanInstallments = (l: Loan) => [[`Pinjaman Karyawan : ${l.number}`],
  ['Tanggal', 'Angsuran Pokok', 'Angsuran Bunga', 'Total Angsuran', 'Pembayaran Pokok', 'Pembayaran Bunga', 'Total Pembayaran', 'Sisa Pokok Pinjaman', 'Nomor Pembayaran']]

/** History Peminjaman per Karyawan */
export const loanHistory = (l: Loan) => [[`Pinjaman Karyawan : ${l.number}`], ['Nomor #', 'Tanggal', 'Keterangan', 'Nilai'], [`${l.number} - ${l.name}`],
  [l.number, fmtDate(l.date), 'Pinjaman Karyawan', formatIdr(l.amount)]]
