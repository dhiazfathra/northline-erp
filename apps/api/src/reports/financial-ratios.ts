import type { StatementLine } from './financial-statements'
// Rasio Keuangan (Per Bulan / Per Tahun); rules in docs/reports/FinancialRatioReport.md.
// Inputs are statement totals in rupiah, so the formulas are checkable against Accurate's own Neraca/Laba-Rugi figures.

export interface BsTotals {
  cash: number; receivable: number; inventory: number; currentAssets: number; fixedAssets: number; assets: number
  payable: number; currentLiabilities: number; longTermLiabilities: number; equity: number
}
export interface PlTotals { revenue: number; cogs: number; operating: number; net: number }
/** One ratio column: balances at the start and end of the period, P&L for the period. */
export interface RatioInput { start: BsTotals; end: BsTotals; pl: PlTotals }

const DAYS = 365
const div = (a: number, b: number) => (b === 0 ? 0 : a / b)
const avg = (a: number, b: number) => (a + b) / 2
const round = (v: number, d: number) => { const x = Math.round(v * 10 ** d) / 10 ** d; return x === 0 ? 0 : x }
/** Modal kerja: cash + receivables + inventory − current liabilities (other current assets excluded). */
const workingCapital = (b: BsTotals) => b.cash + b.receivable + b.inventory - b.currentLiabilities

type Def = [label: string, unit: 'Kali' | '%' | 'Hari', decimals: number, f: (x: RatioInput) => number]
const defs: ([string] | Def)[] = [
  ['Rasio Likuiditas'],
  ['Current Ratio', 'Kali', 2, ({ end }) => div(end.currentAssets, end.currentLiabilities)],
  ['Quick Ratio', 'Kali', 2, ({ end }) => div(end.cash + end.receivable, end.currentLiabilities)],
  ['Cash Ratio', '%', 2, ({ end }) => div(end.cash, end.currentLiabilities) * 100],
  ['Cash Turnover', '%', 2, ({ start, end, pl }) => div(pl.revenue, avg(start.cash, end.cash)) * 100],
  ['Inventory to Net Working Capital', '%', 2, ({ end }) => div(end.inventory, end.currentAssets - end.currentLiabilities) * 100],
  ['Rasio Solvabilitas'],
  ['Debt to Asset Ratio', '%', 1, ({ end }) => div(end.currentLiabilities + end.longTermLiabilities, end.assets) * 100],
  ['Debt to Equity Ratio', '%', 1, ({ end }) => div(end.currentLiabilities + end.longTermLiabilities, end.equity) * 100],
  ['Long Term Liability to Equity Ratio', 'Kali', 2, ({ end }) => div(end.longTermLiabilities, end.equity)],
  ['Equity Multiplier', 'Kali', 2, ({ end }) => div(end.assets, end.equity)],
  ['Rasio Aktifitas'],
  ['Total Asset Turnover', 'Kali', 2, ({ start, end, pl }) => div(pl.revenue, avg(start.assets, end.assets))],
  ['Receivable Turnover', 'Kali', 2, ({ start, end, pl }) => div(pl.revenue, avg(start.receivable, end.receivable))],
  ['Payable Turnover', 'Kali', 2, ({ start, end, pl }) => div(pl.cogs, avg(start.payable, end.payable))],
  ['Average Collection Period', 'Hari', 2, x => div(DAYS, div(x.pl.revenue, avg(x.start.receivable, x.end.receivable)))],
  ['Inventory Turnover', 'Kali', 2, ({ start, end, pl }) => div(pl.cogs, avg(start.inventory, end.inventory))],
  ['Working Capital Turnover', 'Kali', 2, ({ start, end, pl }) => div(pl.revenue, avg(workingCapital(start), workingCapital(end)))],
  ['Days of Receivable', 'Hari', 2, x => div(DAYS, div(x.pl.revenue, avg(x.start.receivable, x.end.receivable)))],
  ['Days of Inventory', 'Hari', 2, x => div(DAYS, div(x.pl.cogs, avg(x.start.inventory, x.end.inventory)))],
  ['Fixed Asset Turnover', 'Kali', 2, ({ start, end, pl }) => div(pl.revenue, avg(start.fixedAssets, end.fixedAssets))],
  ['Rasio Profitabilitas'],
  ['Gross Profit Margin', '%', 2, ({ pl }) => div(pl.revenue - pl.cogs, pl.revenue) * 100],
  ['Operating Profit Margin', '%', 2, ({ pl }) => div(pl.operating, pl.revenue) * 100],
  ['Net Profit Margin', '%', 2, ({ pl }) => div(pl.net, pl.revenue) * 100],
  ['Return On Asset', '%', 1, ({ end, pl }) => div(pl.net, end.assets) * 100],
  ['Return On Equity', '%', 1, ({ end, pl }) => div(pl.net, end.equity) * 100],
]

const fmt = (v: number) => String(v).replace('.', ',')

/** `current` and `previous` are the report period and the one before it (previous month, or previous year). */
export function financialRatios(current: RatioInput, previous: RatioInput, monthly: boolean): string[][] {
  return [
    ['Jenis Rasio', 'Rasio', monthly ? 'Bulan Sebelumnya' : 'Tahun Sebelumnya', 'Satuan'],
    ...defs.map(d => (d.length === 1 ? [d[0]] : [d[0], fmt(round(d[3](current), d[2])), fmt(round(d[3](previous), d[2])), d[1]])),
  ]
}


const pick = (lines: StatementLine[], label: string) => (lines.find(l => l.label === label)?.amount ?? 0) / 100

/** Totals from our own Neraca (Standar) lines, in rupiah. */
export const bsTotals = (l: StatementLine[]): BsTotals => ({
  cash: pick(l, 'Jumlah Kas dan Setara Kas'), receivable: pick(l, 'Jumlah Piutang Usaha'), inventory: pick(l, 'Jumlah Persediaan'),
  currentAssets: pick(l, 'Jumlah Aset Lancar'), fixedAssets: pick(l, 'Jumlah Nilai Histori'), assets: pick(l, 'JUMLAH ASET'),
  payable: pick(l, 'Jumlah Utang'), currentLiabilities: pick(l, 'Jumlah Kewajiban Jangka Pendek'),
  longTermLiabilities: pick(l, 'Jumlah Kewajiban Jangka Panjang'), equity: pick(l, 'Jumlah Ekuitas'),
})
/** Totals from our own Laba/Rugi (Standar) lines, in rupiah. */
export const plTotals = (l: StatementLine[]): PlTotals => ({
  revenue: pick(l, 'Jumlah Pendapatan'), cogs: pick(l, 'Jumlah Beban Pokok Penjualan'), operating: pick(l, 'PENDAPATAN OPERASIONAL'), net: pick(l, 'LABA BERSIH'),
})
