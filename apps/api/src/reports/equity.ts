import { balanceSheet } from './financial-statements'
import { formatIdr, PROFIT_LOSS_TYPES, type DailyBalance, type LedgerSettings, type TbAccount } from './trial-balance'

// Laba Ditahan and Perubahan Ekuitas Pemilik; rules in docs/reports/RetainedEarningReport.md and OwnerEquityChangedReport.md.

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const dayBefore = (iso: string) => new Date(Date.parse(iso + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10)

/** Net income (C − D over P&L accounts) of balances in [from, to]. */
function netIncome(type: Map<string, string>, balances: DailyBalance[], from: string, to: string) {
  return balances.filter(b => PROFIT_LOSS_TYPES.has(type.get(b.account) as any) && b.date >= from && b.date <= to)
    .reduce((s, b) => s + b.credit - b.debit, 0)
}

const equityTotal = (accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, asOf: string) =>
  balanceSheet(accounts, balances, settings, asOf, { showZeroBalance: true, showParentAccount: true }).find(l => l.label === 'Jumlah Ekuitas')!.amount!

/** Retained earnings at the start of `year` (C − D): own postings plus all P&L of the years before, closed into it. */
const retainedBefore = (type: Map<string, string>, balances: DailyBalance[], settings: LedgerSettings, year: number) =>
  balances.filter(b => b.date < `${year}-01-01` && (b.account === settings.retainedEarningsAccount || PROFIT_LOSS_TYPES.has(type.get(b.account) as any)))
    .reduce((s, b) => s + b.credit - b.debit, 0)

/** Assumes a January fiscal year (the only start verified against Accurate). */
export function retainedEarnings(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, year: number): string[][] {
  const type = new Map(accounts.map(a => [a.no, a.type as string]))
  const start = retainedBefore(type, balances, settings, year)
  const months = BULAN.map((m, i) => {
    const from = `${year}-${String(i + 1).padStart(2, '0')}-01`
    const to = new Date(Date.UTC(year, i + 1, 0)).toISOString().slice(0, 10)
    return [m, netIncome(type, balances, from, to)] as const
  })
  const ni = months.reduce((s, [, v]) => s + v, 0)
  const direct = balances.filter(b => b.account === settings.retainedEarningsAccount && b.date.startsWith(`${year}-`)).reduce((s, b) => s + b.credit - b.debit, 0)
  return [
    ['Keterangan', 'Nilai'],
    [`Laba ditahan tahun ${year - 1}`, formatIdr(start)],
    ['Laba Bersih Tahun ini'],
    ...months.map(([m, v]) => [m, formatIdr(v)]),
    ['Total Laba Bersih Tahun ini', formatIdr(ni)],
    [`Perubahan Saldo Transaksi pada Akun Laba Ditahan Tahun ${year}`, formatIdr(direct)],
    [`Peningkatan/Penurunan Laba Ditahan Tahun ${year}`, formatIdr(ni + direct)],
    [`Laba ditahan tahun ${year}`, formatIdr(start + ni + direct)],
  ]
}

export function ownerEquityChange(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, from: string, to: string): string[][] {
  const type = new Map(accounts.map(a => [a.no, a.type as string]))
  const opening = equityTotal(accounts, balances, settings, dayBefore(from))
  const ni = netIncome(type, balances, from, to)
  // Investments/withdrawals: gross credits/debits to equity accounts other than retained earnings.
  const eq = balances.filter(b => type.get(b.account) === 'EQUITY' && b.account !== settings.retainedEarningsAccount && b.date >= from && b.date <= to)
  const invest = eq.reduce((s, b) => s + b.credit, 0), draw = eq.reduce((s, b) => s + b.debit, 0)
  const total = ni + invest - draw
  return [
    ['Keterangan', 'Nilai'],
    ['Ekuitas pemilik awal periode', formatIdr(opening)],
    ['Penambahan Ekuitas Pemilik'],
    ['Pendapatan Bersih', formatIdr(ni)],
    ['Investasi Kurun Periode', formatIdr(invest)],
    ['Penarikan', formatIdr(draw)],
    ['Total Penambahan Ekuitas Pemilik', formatIdr(total)],
    ['Ekuitas Pemilik Akhir Periode', formatIdr(opening + total)],
  ]
}
