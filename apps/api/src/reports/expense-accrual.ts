import { fmtDate } from './general-ledger'
import { formatIdr } from './trial-balance'

export interface ExpenseAccrual { number: string; date: string; dueDate: string; total: number; lines: { account: string; accountName: string; amount: number }[] }

// shortcut: paying an accrual is not modelled; Dibayar is 0 and Status "Sedang diproses" until payments are captured.
const PAID = '0', STATUS = 'Sedang diproses'
const inWindow = (a: ExpenseAccrual, from: string, to: string) => a.date >= from && a.date <= to

/** Ringkasan Pencatatan Beban (docs/reports/ExpenseAccrualSummaryReport.md): accruals dated in the window, newest first. */
export function expenseAccrualSummary(all: ExpenseAccrual[], from: string, to: string): string[][] {
  const rows = all.filter(a => inWindow(a, from, to)).sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number))
  return [['No Beban #', 'Tanggal', 'Jatuh Tempo', 'Total', 'Dibayar', 'Status'], ...rows.map(a => [a.number, fmtDate(a.date), fmtDate(a.dueDate), formatIdr(a.total), PAID, STATUS])]
}

/** Rincian Pencatatan Beban (docs/reports/ExpenseAccrualDetailReport.md): one block per accrual, oldest first; lines in entry order. */
export function expenseAccrualDetail(all: ExpenseAccrual[], from: string, to: string): string[][] {
  return all.filter(a => inWindow(a, from, to)).sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number)).flatMap(a => [
    ['No Beban #', ':', a.number, 'Dibayar', ':', PAID], ['Tanggal', ':', fmtDate(a.date), 'Status', ':', STATUS], ['Jatuh Tempo', ':', fmtDate(a.dueDate)],
    ['Kode Perkiraan', 'Nama Biaya', 'Jumlah'], ...a.lines.map(l => [l.account, l.accountName, formatIdr(l.amount)]), [formatIdr(a.total)]])
}
