import { fmtDate, fmtHeaderDate, type Journal } from './general-ledger'
import { formatIdr } from './trial-balance'

/**
 * Selisih Akun Pembelian belum tertagih (docs/reports/UnbilledAccountBalanceDifferenceReport.md): credit balance of the
 * unbilled account before the window, its change in the window, and (only when non-empty) the receipts still unbilled at
 * the end date. Amounts in cents; credit positive.
 */
// shortcut: receipts are never linked to invoices, so every priced receipt stays unbilled; net them off when GRNI links exist.
export function unbilledDifference(acc: { no: string; name: string }, balances: { account: string; date: string; debit: number; credit: number }[], receipts: Journal[], from: string, to: string): string[][] {
  const net = (f: (d: string) => boolean) => balances.filter(b => b.account === acc.no && f(b.date)).reduce((s, b) => s + b.credit - b.debit, 0)
  const m = (n: number) => formatIdr(n)
  const open = net(d => d < from), change = net(d => d >= from && d <= to), per = `Saldo Pembelian belum tertagih Per ${fmtHeaderDate(from).replace(/^0/, '')}`
  const line = (n: number) => [acc.no, '-', acc.name, m(n)]
  const rows = [['Nomor #', 'Tanggal', 'Tipe Transaksi', 'Keterangan', 'Nilai'], ['Saldo Pembelian belum tertagih'],
    [per], line(open), [`Total dari ${per}`, m(open)],
    ['Perubahan Saldo Pembelian belum tertagih'], line(change), ['Total dari Perubahan Saldo Pembelian belum tertagih', m(change)],
    ['Total dari Saldo Pembelian belum tertagih', m(open + change)]]
  const ri = receipts.filter(j => j.sourceType === 'RI' && j.date <= to)
    .map(j => ({ j, v: j.lines.filter(l => l.account === acc.no).reduce((s, l) => s + l.credit - l.debit, 0) })).filter(x => x.v)
  if (!ri.length) return rows
  const total = m(ri.reduce((s, x) => s + x.v, 0))
  return [...rows, ['Selisih Saldo Pembelian belum tertagih'], ['Penerimaan Barang belum/sebagian tertagih'],
    ...ri.map(({ j, v }) => [j.number, fmtDate(j.date), 'Penerimaan Barang', j.description, m(v)]),
    ['Total dari Penerimaan Barang belum/sebagian tertagih', total], ['Total dari Selisih Saldo Pembelian belum tertagih', total]]
}
