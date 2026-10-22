import { accounts, balanceSheet, idr, journals, parseDate, profitAndLoss } from '@northline/schemas/fixtures'
import type { AiMessage, Report, ReportRow } from '@northline/schemas/reports'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { layoutDefault, type Layout } from '@/features/reports/model'
import { mock } from './mock'

type T = { id: string; en: string }
/** The 16 report groups. 'memorize' holds the reports the user starred. */
export const reportCats: { id: string; name: T; icon: string }[] = [
  { id: 'memorize', name: { id: 'Memorize', en: 'Memorized' }, icon: 'ph-light ph-bookmark-simple' },
  { id: 'fin', name: { id: 'Keuangan', en: 'Financial' }, icon: 'ph-light ph-scales' },
  { id: 'gl', name: { id: 'Buku Besar', en: 'General Ledger' }, icon: 'ph-light ph-book-open' },
  { id: 'cash', name: { id: 'Kas & Bank', en: 'Cash & Bank' }, icon: 'ph-light ph-bank' },
  { id: 'sales', name: { id: 'Penjualan', en: 'Sales' }, icon: 'ph-light ph-shopping-bag' },
  { id: 'ar', name: { id: 'Piutang', en: 'Receivables' }, icon: 'ph-light ph-hand-coins' },
  { id: 'buy', name: { id: 'Pembelian', en: 'Purchases' }, icon: 'ph-light ph-shopping-cart' },
  { id: 'ap', name: { id: 'Utang', en: 'Payables' }, icon: 'ph-light ph-receipt' },
  { id: 'inv', name: { id: 'Persediaan', en: 'Inventory' }, icon: 'ph-light ph-package' },
  { id: 'fa', name: { id: 'Aset Tetap', en: 'Fixed Assets' }, icon: 'ph-light ph-buildings' },
  { id: 'tax', name: { id: 'Perpajakan', en: 'Tax' }, icon: 'ph-light ph-percent' },
  { id: 'dept', name: { id: 'Departemen', en: 'Departments' }, icon: 'ph-light ph-tree-structure' },
  { id: 'proj', name: { id: 'Proyek', en: 'Projects' }, icon: 'ph-light ph-kanban' },
  { id: 'wh', name: { id: 'Gudang', en: 'Warehouses' }, icon: 'ph-light ph-warehouse' },
  { id: 'emp', name: { id: 'Karyawan', en: 'Employees' }, icon: 'ph-light ph-identification-card' },
  { id: 'other', name: { id: 'Lain-lain', en: 'Other' }, icon: 'ph-light ph-dots-three-circle' },
]

export const reportTypes: { id: 'all' | Report['type']; name: T; c: string }[] = [
  { id: 'all', name: { id: 'Semua', en: 'All' }, c: '' },
  { id: 'std', name: { id: 'Standar', en: 'Standard' }, c: '#a855f7' },
  { id: 'anl', name: { id: 'Analisis', en: 'Analysis' }, c: '#38bdf8' },
  { id: 'tax', name: { id: 'Pajak', en: 'Tax' }, c: '#f59e0b' },
]

const r = (id: string, cat: string, type: Report['type'], icon: string, dates: Report['dates'], name: T, desc: T, href?: string): Report => ({ id, cat, type, icon, dates, name, desc, starred: false, href })
const reports: Report[] = [
  r('neraca', 'fin', 'std', 'ph-light ph-scales', 'point', { id: 'Neraca (Standar)', en: 'Balance Sheet (Standard)' }, { id: 'Posisi aset, liabilitas, dan ekuitas per tanggal tertentu.', en: 'Assets, liabilities and equity as of a date.' }),
  r('laba-rugi', 'fin', 'std', 'ph-light ph-chart-line-up', 'range', { id: 'Laba/Rugi (Standar)', en: 'Profit & Loss (Standard)' }, { id: 'Pendapatan, beban, dan laba bersih untuk satu periode.', en: 'Revenue, expenses and net profit for a period.' }),
  r('arus-kas', 'fin', 'std', 'ph-light ph-arrows-left-right', 'range', { id: 'Arus Kas', en: 'Cash Flow' }, { id: 'Arus kas operasi, investasi, dan pendanaan (metode tidak langsung).', en: 'Operating, investing and financing cash flows (indirect method).' }),
  r('neraca-saldo', 'gl', 'std', 'ph-light ph-list-checks', 'point', { id: 'Neraca Percobaan', en: 'Trial Balance' }, { id: 'Saldo debit dan kredit seluruh akun.', en: 'Debit and credit balances for every account.' }, '/ledger/trial-balance'),
  r('saldo-akun', 'gl', 'std', 'ph-light ph-book-open', 'point', { id: 'Saldo Akun Perkiraan', en: 'Account Balances' }, { id: 'Saldo setiap akun; induk menjumlahkan sub-akun.', en: 'Balance of every account; parents sum their children.' }),
  r('kas-bank', 'cash', 'std', 'ph-light ph-bank', 'point', { id: 'Saldo Kas & Bank', en: 'Cash & Bank Balances' }, { id: 'Saldo per rekening kas dan bank.', en: 'Balance per cash and bank account.' }),
  r('penjualan', 'sales', 'std', 'ph-light ph-tag', 'range', { id: 'Ringkasan Penjualan', en: 'Sales Summary' }, { id: 'Pendapatan per akun penjualan, termasuk diskon dan retur.', en: 'Revenue per sales account, net of discounts and returns.' }),
  r('piutang', 'ar', 'anl', 'ph-light ph-hand-coins', 'point', { id: 'Saldo Piutang', en: 'Receivables Balance' }, { id: 'Piutang usaha yang belum dilunasi.', en: 'Open trade receivables.' }),
  r('pembelian', 'buy', 'std', 'ph-light ph-shopping-cart', 'range', { id: 'Ringkasan Pembelian', en: 'Purchases Summary' }, { id: 'Beban dan persediaan dari faktur pembelian.', en: 'Expenses and stock from purchase invoices.' }),
  r('utang', 'ap', 'anl', 'ph-light ph-receipt', 'point', { id: 'Saldo Utang', en: 'Payables Balance' }, { id: 'Utang usaha dan liabilitas jangka pendek.', en: 'Trade payables and current liabilities.' }),
  r('persediaan', 'inv', 'std', 'ph-light ph-package', 'point', { id: 'Nilai Persediaan', en: 'Inventory Valuation' }, { id: 'Nilai persediaan barang (FIFO).', en: 'Inventory value (FIFO).' }),
  r('aset-tetap', 'fa', 'std', 'ph-light ph-buildings', 'point', { id: 'Daftar Aset Tetap', en: 'Fixed Asset Register' }, { id: 'Harga perolehan, akumulasi penyusutan, dan nilai buku.', en: 'Cost, accumulated depreciation and book value.' }),
  r('pajak', 'tax', 'tax', 'ph-light ph-percent', 'range', { id: 'Rekap PPN & PPh 23', en: 'VAT & WHT Art. 23 Summary' }, { id: 'PPN keluaran, PPN masukan, dan PPh 23 terutang.', en: 'Output VAT, input VAT and Art. 23 withholding.' }),
  r('jurnal-sumber', 'other', 'anl', 'ph-light ph-notebook', 'range', { id: 'Ringkasan Jurnal per Sumber', en: 'Journals by Source' }, { id: 'Total debit jurnal per jenis transaksi sumber.', en: 'Journal debit totals per source transaction type.' }),
]

export const reportsQuery = queryOptions({ queryKey: ['reports'], queryFn: () => mock(reports) })

export function useStarReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const x = reports.find((y) => y.id === id)!
      x.starred = !x.starred
      return mock(x, 150)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  })
}

// ---- report rows from the API ----

/** Each catalog report and the API request that returns it. `tree` endpoints answer {label, amount, kind}[] in cents; the rest answer Accurate's grid (string[][]). */
const sources: Record<string, { path: string; tree?: true; range?: true }> = {
  neraca: { path: 'balance-sheet', tree: true },
  'laba-rugi': { path: 'profit-loss', tree: true, range: true },
  'arus-kas': { path: 'cash-flow/indirect', range: true },
  'saldo-akun': { path: 'general-ledger/summary', range: true },
  'kas-bank': { path: 'cash-bank/cash-flow-by-account', range: true },
  penjualan: { path: 'receivables/sales-by-customer', range: true },
  piutang: { path: 'receivables/outstanding' },
  pembelian: { path: 'payables/by-vendor', range: true },
  utang: { path: 'payables/outstanding' },
  persediaan: { path: 'inventory/valuation', range: true },
  'aset-tetap': { path: 'fixed-assets/list' },
  pajak: { path: 'tax/ppn/in-out', range: true },
  'jurnal-sumber': { path: 'general-ledger/journal-list', range: true },
}

type Tree = { label: string; amount?: number; kind: 'heading' | 'account' | 'total' }[]
/** `rows` for the statement layout (current vs comparison column); `grid` for Accurate's tabular reports, header row first. */
export type ReportData = { rows: ReportRow[] } | { grid: string[][] }

const isoShift = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
// Plain fetch: the paths are chosen at runtime, which the typed hono client cannot express.
async function get<T>(path: string, q: Record<string, string>): Promise<T> {
  const res = await fetch(`/api/reports/${path}?${new URLSearchParams(q)}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Laporan gagal dimuat (${res.status})`)
  return res.json() as Promise<T>
}

/**
 * Point-in-time reports compare with the day before `to`; ranges with the same-length window right before `from`.
 * A range report opened without `from` runs from 1 January of `to`'s year.
 */
/** Stable key per row: kind and label, plus the occurrence number, so two accounts with the same name stay apart. */
export function rowKeys(rows: { k: string; t: string }[]): string[] {
  const seen = new Map<string, number>()
  return rows.map((r) => {
    const base = `${r.k}:${r.t}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return `${base}#${n}`
  })
}

export async function fetchReport(id: string, s: { from?: string; to: string }): Promise<ReportData> {
  const src = sources[id]
  if (!src) throw new Error(`Laporan ${id} belum tersedia`)
  const from = s.from ?? `${s.to.slice(0, 4)}-01-01`
  const q = (f: string, t: string): Record<string, string> => (src.range ? { from: f, to: t } : { asOf: t })
  if (!src.tree) return { grid: await get<string[][]>(src.path, q(from, s.to)) }
  const days = Math.round((Date.parse(s.to) - Date.parse(from)) / 864e5)
  const [cur, prev] = await Promise.all([
    get<Tree>(src.path, q(from, s.to)),
    get<Tree>(src.path, src.range ? q(isoShift(from, -days - 1), isoShift(from, -1)) : q(from, isoShift(s.to, -1))),
  ])
  const prevKeys = rowKeys(prev.map((r) => ({ k: r.kind, t: r.label })))
  const before = new Map(prev.map((r, i) => [prevKeys[i]!, r.amount]))
  const curKeys = rowKeys(cur.map((r) => ({ k: r.kind, t: r.label })))
  const k = { heading: 'sec', account: 'acc', total: 'tot' } as const
  const rupiah = (c?: number) => (c === undefined ? undefined : c / 100)
  return { rows: cur.map((r, i) => ({ k: k[r.kind], t: r.label, cur: rupiah(r.amount), prev: r.amount === undefined ? undefined : rupiah(before.get(curKeys[i]!) ?? 0) })) }
}

export const reportRowsQuery = (id: string, s: { from?: string; to: string }) =>
  queryOptions({ queryKey: ['reports', id, 'rows', s.from, s.to], queryFn: () => fetchReport(id, s) })

const dmy = (iso: string) => iso.split('-').reverse().join('/')
const kids = (code: string) => accounts.filter((a) => a.parent === code)

/** Fixture journal lines posted to `code` within the report period (drill-down). */
export const drillQuery = (code: string, s: { from?: string; to: string }) =>
  queryOptions({
    queryKey: ['reports', 'drill', code, s.from, s.to],
    queryFn: () => {
      const [a, b] = [parseDate(dmy(s.from ?? '2000-01-01')), parseDate(dmy(s.to))]
      const codes = [code, ...kids(code).map((k) => k.code)]
      const lines = journals
        .filter((j) => parseDate(j.date) >= a && parseDate(j.date) <= b)
        .flatMap((j) => j.lines.filter((l) => codes.includes(l.account)).map((l) => ({ no: j.no, jv: j.jv, date: j.date, source: j.source, desc: j.description, debit: l.debit, credit: l.credit })))
        .sort((x, y) => parseDate(x.date) - parseDate(y.date))
      return mock(lines, 300)
    },
  })

// ---- AI panel: canned replies quoting fixture figures ----
const pl = profitAndLoss()
const bs = balanceSheet()
const answers = [
  `Laba bersih ${idr(pl.netIncome)} terutama karena rugi pelepasan aset tetap ${idr(pl.otherExpense)}. Tanpa pos itu, laba operasional ${idr(pl.grossProfit - pl.opex)}.`,
  `Pendapatan Operasional ${idr(pl.pendapatanOperasional)}, dikurangi Diskon Penjualan IDR menjadi ${idr(pl.revenue)}. Beban pokok penjualan ${idr(pl.cogs)}, laba kotor ${idr(pl.grossProfit)}.`,
  `Kas dan setara kas ${idr(bs.cash)} jauh di atas liabilitas ${idr(bs.liabilities)}, jadi likuiditas kuat.`,
  `Aset ${idr(bs.assets)} = Liabilitas ${idr(bs.liabilities)} + Ekuitas ${idr(bs.equity)}. Neraca seimbang.`,
]
let turn = 0
const now = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
export const aiGreeting = (report: string): AiMessage => ({
  id: 'g',
  bot: true,
  t: `Saya sudah membaca ${report} PT Harbor Nusantara. Laba bersih periode ini ${idr(pl.netIncome)}, terbebani rugi pelepasan aset ${idr(pl.otherExpense)}. Tanyakan apa saja tentang angka di laporan ini.`,
  tm: '10:24',
  cr: '1 kredit',
})

export function useAskAi() {
  return useMutation({
    mutationFn: (_q: string): Promise<AiMessage> => mock({ id: `b${Date.now()}`, bot: true, t: answers[turn++ % answers.length], tm: now(), cr: '2 kredit' }, 1600),
  })
}
export const aiNow = now

const layouts: Record<string, Layout> = {}
export const reportLayoutQuery = (id: string) => queryOptions({ queryKey: ['reports', id, 'layout'], queryFn: () => mock(layouts[id] ?? layoutDefault, 0) })
export function useSaveLayout(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (l: Layout) => {
      layouts[id] = l
      return mock(l, 300)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', id, 'layout'] }),
  })
}
