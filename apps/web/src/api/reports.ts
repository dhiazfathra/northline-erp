import { accounts, balances, balanceSheet, idr, journals, naturalBalance, parseDate, profitAndLoss, type Account, type AccountType } from '@northline/schemas/fixtures'
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

// ---- report rows derived from the fixture ledger ----

const dmy = (iso: string) => iso.split('-').reverse().join('/')
/** dd/mm/yyyy of `iso` shifted by `days` (local time). */
const shift = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
const dayBefore = (iso: string) => shift(iso, -1)
const acc = (code: string) => accounts.find((a) => a.code === code)!
const kids = (code: string) => accounts.filter((a) => a.parent === code)

type Bal = Map<string, number>
/** Amount of `a` in `dir`'s direction (contra/opposite-side accounts come out negative). */
const inDir = (a: Account, dir: 'D' | 'K', bal: Bal) => (kids(a.code).length ? naturalBalance(a.code, bal) * (a.normal === dir ? 1 : -1) : (bal.get(a.code) ?? 0) * (dir === 'D' ? 1 : -1))

/** An account row; parents become a group row (sum of children) followed by their children. */
function accRows(code: string, dir: 'D' | 'K', cur: Bal, prev: Bal): ReportRow[] {
  const a = acc(code)
  const ks = kids(code)
  const row = { code, t: a.name, cur: inDir(a, dir, cur), prev: inDir(a, dir, prev) }
  return ks.length ? [{ k: 'grp', ...row }, ...ks.map((k) => ({ k: 'acc' as const, code: k.code, t: k.name, cur: inDir(k, dir, cur), prev: inDir(k, dir, prev) }))] : [{ k: 'acc', ...row }]
}
const tot = (k: 'sub' | 'tot', t: string, cur: number, prev: number): ReportRow => ({ k, t, cur, prev })
const sec = (t: string): ReportRow => ({ k: 'sec', t })
const ofType = (...ts: AccountType[]) => accounts.filter((a) => ts.includes(a.type) && !a.parent).map((a) => a.code)
const sumRows = (rows: ReportRow[], key: 'cur' | 'prev') => rows.filter((x) => (x.k === 'acc' && !acc(x.code!).parent) || x.k === 'grp').reduce((s, x) => s + (x[key] ?? 0), 0)

function labaRugi(cur: Bal, prev: Bal): ReportRow[] {
  const [p, q] = [profitAndLoss(cur), profitAndLoss(prev)]
  return [
    sec('Pendapatan'),
    ...accRows('4000', 'K', cur, prev),
    ...accRows('440101', 'K', cur, prev),
    tot('sub', 'Total Pendapatan', p.revenue, q.revenue),
    sec('Beban Pokok Penjualan'),
    ...accRows('510101', 'D', cur, prev),
    tot('tot', 'Laba Kotor', p.grossProfit, q.grossProfit),
    sec('Beban Operasional'),
    ...accRows('6000', 'D', cur, prev),
    tot('tot', 'Laba Operasional', p.grossProfit - p.opex, q.grossProfit - q.opex),
    sec('Pendapatan & Beban Lain-lain'),
    ...accRows('720102', 'K', cur, prev),
    ...accRows('7201', 'K', cur, prev),
    tot('sub', 'Total Pendapatan & Beban Lain-lain', p.otherIncome - p.otherExpense, q.otherIncome - q.otherExpense),
    tot('tot', 'Laba Bersih', p.netIncome, q.netIncome),
  ]
}

function neraca(cur: Bal, prev: Bal): ReportRow[] {
  const [b, c] = [balanceSheet(cur), balanceSheet(prev)]
  const block = (codes: string[], dir: 'D' | 'K') => codes.flatMap((x) => accRows(x, dir, cur, prev))
  return [
    sec('Aset'),
    ...block(['1100', '110301', '110401', '110501', '1200'], 'D'),
    tot('tot', 'Total Aset', b.assets, c.assets),
    sec('Liabilitas'),
    ...block(['210101', '210102', '210201', '210301'], 'K'),
    tot('sub', 'Total Liabilitas', b.liabilities, c.liabilities),
    sec('Ekuitas'),
    ...block(['3001', '300001'], 'K'),
    { k: 'acc', t: 'Laba Tahun Berjalan', cur: b.currentEarnings, prev: c.currentEarnings },
    tot('sub', 'Total Ekuitas', b.equity, c.equity),
    tot('tot', 'Total Liabilitas dan Ekuitas', b.liabilities + b.equity, c.liabilities + c.equity),
  ]
}

/** Equity credits from inventory adjustments / fixed-asset opening balances: no cash moved. */
const nonCash = (from: number, to: number, source: string) =>
  journals.filter((j) => j.source === source && parseDate(j.date) >= from && parseDate(j.date) <= to).reduce((s, j) => s + j.lines.filter((l) => l.account === '300001').reduce((x, l) => x + l.credit - l.debit, 0), 0)

function cashFlow(fromIso: string, toIso: string): ReportRow[] {
  const [from, to] = [dmy(fromIso), dmy(toIso)]
  const mv = balances(from, to)
  const d = (code: string) => mv.get(code) ?? 0 // debit-positive movement
  const pl = profitAndLoss(mv)
  const ncInv = nonCash(parseDate(from), parseDate(to), 'Penyesuaian Persediaan')
  const ncFa = nonCash(parseDate(from), parseDate(to), 'Aset Tetap')
  const line = (t: string, v: number, code?: string): ReportRow => ({ k: 'acc', t, cur: v, code })
  const op = [
    line('Laba Bersih', pl.netIncome),
    line('Beban Penyusutan', d('6101'), '6101'),
    line('Rugi Pelepasan Aset Tetap', d('7201'), '7201'),
    line('Kenaikan Piutang Usaha', -d('110301'), '110301'),
    line('Kenaikan Persediaan (di luar penyesuaian non-kas)', -(d('110401') - ncInv), '110401'),
    line('Kenaikan PPN Masukan', -d('110501'), '110501'),
    ...['210101', '210102', '210201', '210301'].map((c) => line(`Kenaikan ${acc(c).name}`, -d(c), c)),
  ]
  const opT = op.reduce((s, x) => s + x.cur!, 0)
  // shortcut: assumes disposals have no proceeds (true for the fixtures); add a proceeds line when sales of assets exist.
  const invT = -(naturalBalance('1200', mv) + d('6101') + d('7201') - ncFa)
  const fin = [line('Setoran Modal', -d('3001'), '3001')]
  const finT = fin.reduce((s, x) => s + x.cur!, 0)
  const opening = naturalBalance('1100', balances('01/01/2000', dayBefore(fromIso)))
  const closing = naturalBalance('1100', balances('01/01/2000', to))
  return [
    sec('Arus Kas dari Aktivitas Operasi'),
    ...op,
    tot('sub', 'Kas Bersih dari Aktivitas Operasi', opT, 0),
    sec('Arus Kas dari Aktivitas Investasi'),
    line('Perolehan Aset Tetap (tunai)', invT, '1201'),
    tot('sub', 'Kas Bersih dari Aktivitas Investasi', invT, 0),
    sec('Arus Kas dari Aktivitas Pendanaan'),
    ...fin,
    tot('sub', 'Kas Bersih dari Aktivitas Pendanaan', finT, 0),
    tot('tot', 'Kenaikan (Penurunan) Kas', opT + invT + finT, 0),
    line('Kas Awal Periode', opening),
    tot('tot', 'Kas Akhir Periode', opening + opT + invT + finT, 0),
    ...kids('1100').map((k) => ({ ...line(`· ${k.name}`, naturalBalance(k.code, balances('01/01/2000', to)), k.code), k: 'acc' as const })),
    tot('sub', 'Saldo Kas dan Setara Kas (Neraca)', closing, 0),
    sec('Transaksi Non-Kas'),
    line('Penyesuaian persediaan ke Ekuitas Saldo Awal', ncInv),
    line('Saldo awal aset tetap ke Ekuitas Saldo Awal', ncFa),
  ]
}

function simple(codes: string[], dir: 'D' | 'K', title: string, cur: Bal, prev: Bal): ReportRow[] {
  const rows = codes.flatMap((c) => accRows(c, dir, cur, prev))
  return [sec(title), ...rows, tot('tot', 'Total', sumRows(rows, 'cur'), sumRows(rows, 'prev'))]
}

function bySource(fromIso: string, toIso: string): ReportRow[] {
  const [a, b] = [parseDate(dmy(fromIso)), parseDate(dmy(toIso))]
  const m = new Map<string, number>()
  for (const j of journals) if (parseDate(j.date) >= a && parseDate(j.date) <= b) m.set(j.source, (m.get(j.source) ?? 0) + j.lines.reduce((s, l) => s + l.debit, 0))
  const rows: ReportRow[] = [...m].map(([t, v]) => ({ k: 'acc', t, cur: v }))
  return [sec('Jurnal per Sumber'), ...rows, tot('tot', 'Total Debit', rows.reduce((s, x) => s + x.cur!, 0), 0)]
}

export function buildRows(id: string, s: { from?: string; to: string }): ReportRow[] {
  const from = s.from ?? '2000-01-01'
  // point-in-time reports compare with the previous day; ranges with the period before `from`
  const cur = s.from ? balances(dmy(from), dmy(s.to)) : balances('01/01/2000', dmy(s.to))
  const prev = balances('01/01/2000', dayBefore(s.from ?? s.to))
  // ranges compare with the same-length window right before `from`
  const days = Math.round((parseDate(dmy(s.to)) - parseDate(dmy(from))) / 864e5)
  const prevWin = s.from ? balances(shift(from, -days - 1), dayBefore(from)) : prev
  if (id === 'laba-rugi') return labaRugi(cur, prevWin)
  if (id === 'neraca') return neraca(balances('01/01/2000', dmy(s.to)), prev)
  if (id === 'arus-kas') return cashFlow(from, s.to)
  if (id === 'jurnal-sumber') return bySource(from, s.to)
  const spec: Record<string, [string[], 'D' | 'K', string]> = {
    'saldo-akun': [accounts.filter((a) => !a.parent).map((a) => a.code), 'D', 'Saldo Akun (debit positif)'],
    'kas-bank': [['1100'], 'D', 'Kas & Bank'],
    penjualan: [[...ofType('Pendapatan')], 'K', 'Pendapatan Penjualan'],
    piutang: [['110301'], 'D', 'Piutang Usaha'],
    pembelian: [['6002', '110401'], 'D', 'Pembelian'],
    utang: [ofType('Utang Usaha', 'Liabilitas Jangka Pendek'), 'K', 'Utang & Liabilitas Jangka Pendek'],
    persediaan: [['110401'], 'D', 'Persediaan'],
    'aset-tetap': [['1200'], 'D', 'Aset Tetap'],
    pajak: [['210201', '110501', '210301'], 'K', 'PPN & PPh 23'],
  }
  const x = spec[id]
  return x ? simple(x[0], x[1], x[2], id === 'penjualan' || id === 'pembelian' || id === 'pajak' ? cur : balances('01/01/2000', dmy(s.to)), id === 'penjualan' || id === 'pembelian' || id === 'pajak' ? prevWin : prev) : []
}

export const reportRowsQuery = (id: string, s: { from?: string; to: string }) =>
  queryOptions({ queryKey: ['reports', id, 'rows', s.from, s.to], queryFn: () => mock(buildRows(id, s), 1400) })

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
