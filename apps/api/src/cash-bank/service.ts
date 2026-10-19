import { sql } from 'drizzle-orm'
import type { Db, Tx } from '../db'
import { DomainError } from '../ledger/deciders'
import { handleTx } from '../ledger/handler'
import { nextNumber, period } from '../sales/service'

type CashDocument = { idempotencyKey: string; kind: 'PAY' | 'DEP'; number?: string; bank: string; date: string; chequeNo?: string; description?: string; lines: { account: string; amount: number; notes?: string }[] }

// Pembayaran / Penerimaan (fixtures/cash-bank-t18.json): number <bank>.yyyy.mm.nnnnn; payment Dr accounts / Cr bank, deposit Dr bank / Cr accounts.
export async function createCashDocument(db: Db | Tx, d: CashDocument) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${d.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [bank] = await tx.execute(sql`SELECT type FROM accounts WHERE no = ${d.bank}`)
    if (bank?.type !== 'CASH_BANK') throw new DomainError(`${d.bank} bukan akun Kas & Bank`)
    if (!d.lines?.length) throw new DomainError('Detail dari transaksi belum diisi!') // Accurate's text (docs/parity/kas-bank)
    const lines = d.lines.map(l => ({ ...l, cents: Math.round(l.amount * 100) })), total = lines.reduce((s, l) => s + l.cents, 0)
    const number = d.number ?? await nextNumber(tx, `${d.bank}.${period(d.date)}`)
    const rp = (c: number) => (c / 100).toFixed(2), pay = d.kind === 'PAY'
    const journalId = crypto.randomUUID()
    const bankLine = { account: d.bank, side: (pay ? 'CREDIT' : 'DEBIT') as 'CREDIT' | 'DEBIT', amount: rp(total) }
    const others = lines.map(l => ({ account: l.account, side: (pay ? 'DEBIT' : 'CREDIT') as 'CREDIT' | 'DEBIT', amount: rp(l.cents) }))
    await handleTx(tx, { type: 'PostJournal', idempotencyKey: `${d.idempotencyKey}:journal`, journalId, number, sourceType: pay ? 'OP' : 'OD', date: d.date, description: d.description ?? '',
      lines: pay ? [...others, bankLine] : [bankLine, ...others] })
    await tx.execute(sql`INSERT INTO cash_documents VALUES (${number}, ${d.kind}, ${d.bank}, ${d.date}, ${d.chequeNo ?? ''}, ${d.description ?? ''}, ${total}, ${journalId})`)
    for (const [i, l] of lines.entries()) await tx.execute(sql`INSERT INTO cash_document_lines VALUES (${number}, ${i + 1}, ${l.account}, ${l.cents}, ${l.notes ?? ''})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${d.idempotencyKey}, 'CreateCashDocument', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

/** Takes back a Pembayaran/Penerimaan: its lines, row and journal. */
async function removeCashDocument(tx: Tx, number: string, idempotencyKey: string) {
  const [doc] = await tx.execute(sql`SELECT journal_id FROM cash_documents WHERE number = ${number} FOR UPDATE`)
  if (!doc) throw new DomainError(`${number} tidak ditemukan`)
  await tx.execute(sql`DELETE FROM cash_document_lines WHERE document_number = ${number}`)
  await tx.execute(sql`DELETE FROM cash_documents WHERE number = ${number}`)
  await handleTx(tx, { type: 'DeleteJournal', idempotencyKey: `${idempotencyKey}:unpost`, journalId: doc.journal_id as string })
}

export async function deleteCashDocument(db: Db, number: string, idempotencyKey: string) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${idempotencyKey}`)
    if (done) return done.result as { number: string }
    await removeCashDocument(tx, number, idempotencyKey)
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${idempotencyKey}, 'DeleteCashDocument', ${JSON.stringify({ number })}::jsonb)`)
    return { number }
  })
}

/** Accurate edits in place: the old document is taken back and the new content saved under the same number. */
export async function editCashDocument(db: Db, number: string, d: CashDocument) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${d.idempotencyKey}`)
    if (done) return done.result as { number: string }
    await removeCashDocument(tx, number, d.idempotencyKey)
    return createCashDocument(tx, { ...d, number: d.number ?? number })
  })
}

// Pencatatan Beban (fixtures/expense-accrual-t26.json): number EXP.yyyy.mm.nnnnn; Dr each expense line in entry order / Cr the payable account.
export async function createExpenseAccrual(db: Db, d: { idempotencyKey: string; number?: string; date: string; dueDate: string; description?: string; payableAccount: string; lines: { account: string; amount: number }[] }) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${d.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const lines = d.lines.map(l => ({ ...l, cents: Math.round(l.amount * 100) })), total = lines.reduce((s, l) => s + l.cents, 0)
    const number = d.number ?? await nextNumber(tx, `EXP.${period(d.date)}`)
    const rp = (c: number) => (c / 100).toFixed(2), journalId = crypto.randomUUID()
    await handleTx(tx, { type: 'PostJournal', idempotencyKey: `${d.idempotencyKey}:journal`, journalId, number, sourceType: 'EXP', date: d.date, description: d.description ?? '',
      lines: [...lines.map(l => ({ account: l.account, side: 'DEBIT' as const, amount: rp(l.cents) })), { account: d.payableAccount, side: 'CREDIT' as const, amount: rp(total) }] })
    await tx.execute(sql`INSERT INTO expense_accruals VALUES (${number}, ${d.date}, ${d.dueDate}, ${d.description ?? ''}, ${d.payableAccount}, ${total}, ${journalId})`)
    for (const [i, l] of lines.entries()) await tx.execute(sql`INSERT INTO expense_accrual_lines VALUES (${number}, ${i + 1}, ${l.account}, ${l.cents})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${d.idempotencyKey}, 'CreateExpenseAccrual', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}
