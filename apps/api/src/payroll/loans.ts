import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { fmtDate } from '../reports/general-ledger'
import { formatIdr } from '../reports/trial-balance'

// Pinjaman Karyawan (fixtures/employee-loan-t17.json). Only a loan without installment schedule or disbursement is verified:
// shortcut: no schedule, disbursement, installments or journals yet; add them when those reports are captured with a disbursed loan.

export async function upsertEmployee(db: Db, e: { no: string; name: string }) {
  await db.execute(sql`INSERT INTO employees VALUES (${e.no}, ${e.name}) ON CONFLICT (no) DO UPDATE SET name = EXCLUDED.name`)
}
export async function createEmployeeLoan(db: Db, l: { number: string; employee: string; date: string; amount: number; interestRate?: number; description?: string }) {
  await db.execute(sql`INSERT INTO employee_loans VALUES (${l.number}, ${l.employee}, ${l.date}, ${Math.round(l.amount * 100)}, ${l.interestRate ?? 0}, ${l.description ?? ''})`)
  return { number: l.number }
}

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
