import type { AiMessage, Report, ReportRow } from '@northline/schemas/reports'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { mock } from './mock'
import { layoutDefault, type Layout } from '@/features/reports/model'

type T = { id: string; en: string }
export const reportCats: { id: string; name: T; icon: string }[] = [
  { id: 'all', name: { id: 'Semua Laporan', en: 'All Reports' }, icon: 'ph-light ph-files' },
  { id: 'fav', name: { id: 'Favorit', en: 'Favourites' }, icon: 'ph-light ph-star' },
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
]

export const reportTypes: { id: 'all' | Report['type']; name: T; c: string }[] = [
  { id: 'all', name: { id: 'Semua', en: 'All' }, c: '' },
  { id: 'std', name: { id: 'Standar', en: 'Standard' }, c: '#a855f7' },
  { id: 'anl', name: { id: 'Analisis', en: 'Analysis' }, c: '#38bdf8' },
  { id: 'tax', name: { id: 'Pajak', en: 'Tax' }, c: '#f59e0b' },
]

const r = (id: string, cat: string, type: Report['type'], icon: string, dates: Report['dates'], name: T, desc: T, starred = false): Report => ({ id, cat, type, icon, dates, name, desc, starred })
const reports: Report[] = [
  r('neraca', 'fin', 'std', 'ph-light ph-scales', 'point', { id: 'Neraca', en: 'Balance Sheet' }, { id: 'Posisi aset, liabilitas, dan ekuitas per tanggal tertentu.', en: 'Assets, liabilities and equity as of a date.' }, true),
  r('laba-rugi', 'fin', 'std', 'ph-light ph-chart-line-up', 'range', { id: 'Laba Rugi', en: 'Profit & Loss' }, { id: 'Pendapatan, beban, dan laba bersih untuk satu periode.', en: 'Revenue, expenses and net profit for a period.' }, true),
  r('arus-kas', 'fin', 'std', 'ph-light ph-arrows-left-right', 'range', { id: 'Arus Kas', en: 'Cash Flow' }, { id: 'Arus kas operasi, investasi, dan pendanaan.', en: 'Operating, investing and financing cash flows.' }),
  r('ekuitas', 'fin', 'std', 'ph-light ph-chart-pie-slice', 'range', { id: 'Perubahan Ekuitas', en: 'Changes in Equity' }, { id: 'Mutasi modal dan saldo laba selama periode.', en: 'Movements in capital and retained earnings.' }),
  r('laba-rugi-bulanan', 'fin', 'anl', 'ph-light ph-calendar-dots', 'range', { id: 'Laba Rugi per Bulan', en: 'Monthly Profit & Loss' }, { id: 'Perbandingan laba rugi antar bulan.', en: 'Month-over-month profit and loss.' }),
  r('neraca-saldo', 'gl', 'std', 'ph-light ph-list-checks', 'point', { id: 'Neraca Saldo', en: 'Trial Balance' }, { id: 'Saldo debit dan kredit seluruh akun.', en: 'Debit and credit balances for every account.' }, true),
  r('buku-besar', 'gl', 'std', 'ph-light ph-book-open', 'range', { id: 'Buku Besar', en: 'General Ledger' }, { id: 'Rincian transaksi per akun beserta saldo berjalan.', en: 'Transactions per account with running balance.' }),
  r('jurnal', 'gl', 'std', 'ph-light ph-notebook', 'range', { id: 'Daftar Jurnal', en: 'Journal Listing' }, { id: 'Semua jurnal yang diposting dalam periode.', en: 'All journals posted in the period.' }),
  r('mutasi-kas', 'cash', 'std', 'ph-light ph-bank', 'range', { id: 'Mutasi Kas & Bank', en: 'Cash & Bank Movements' }, { id: 'Penerimaan dan pengeluaran per rekening.', en: 'Receipts and payments per account.' }),
  r('rekonsiliasi', 'cash', 'anl', 'ph-light ph-check-square-offset', 'point', { id: 'Rekonsiliasi Bank', en: 'Bank Reconciliation' }, { id: 'Selisih saldo buku dengan rekening koran.', en: 'Book balance vs bank statement differences.' }),
  r('penjualan-pelanggan', 'sales', 'std', 'ph-light ph-users-three', 'range', { id: 'Penjualan per Pelanggan', en: 'Sales by Customer' }, { id: 'Total penjualan dikelompokkan per pelanggan.', en: 'Sales totals grouped by customer.' }),
  r('penjualan-barang', 'sales', 'anl', 'ph-light ph-tag', 'range', { id: 'Penjualan per Barang', en: 'Sales by Item' }, { id: 'Kuantitas dan nilai penjualan setiap barang.', en: 'Quantity and value sold per item.' }),
  r('umur-piutang', 'ar', 'anl', 'ph-light ph-hourglass-medium', 'point', { id: 'Umur Piutang', en: 'Receivables Aging' }, { id: 'Piutang belum lunas berdasarkan umur jatuh tempo.', en: 'Open receivables by days overdue.' }, true),
  r('kartu-piutang', 'ar', 'std', 'ph-light ph-address-book', 'range', { id: 'Kartu Piutang', en: 'Customer Statement' }, { id: 'Mutasi piutang per pelanggan.', en: 'Receivable movements per customer.' }),
  r('pembelian-pemasok', 'buy', 'std', 'ph-light ph-truck', 'range', { id: 'Pembelian per Pemasok', en: 'Purchases by Supplier' }, { id: 'Total pembelian dikelompokkan per pemasok.', en: 'Purchase totals grouped by supplier.' }),
  r('umur-utang', 'ap', 'anl', 'ph-light ph-hourglass-low', 'point', { id: 'Umur Utang', en: 'Payables Aging' }, { id: 'Utang belum dibayar berdasarkan umur jatuh tempo.', en: 'Open payables by days overdue.' }),
  r('nilai-persediaan', 'inv', 'std', 'ph-light ph-package', 'point', { id: 'Nilai Persediaan', en: 'Inventory Valuation' }, { id: 'Kuantitas dan nilai persediaan per gudang.', en: 'Stock quantity and value per warehouse.' }),
  r('kartu-stok', 'inv', 'std', 'ph-light ph-stack', 'range', { id: 'Kartu Stok', en: 'Stock Card' }, { id: 'Mutasi masuk dan keluar setiap barang.', en: 'Stock in and out per item.' }),
  r('daftar-aset', 'fa', 'std', 'ph-light ph-buildings', 'point', { id: 'Daftar Aset Tetap', en: 'Fixed Asset Register' }, { id: 'Harga perolehan, akumulasi penyusutan, dan nilai buku.', en: 'Cost, accumulated depreciation and book value.' }),
  r('penyusutan', 'fa', 'anl', 'ph-light ph-trend-down', 'range', { id: 'Penyusutan Aset', en: 'Depreciation Schedule' }, { id: 'Beban penyusutan per aset dalam periode.', en: 'Depreciation expense per asset for the period.' }),
  r('ppn', 'tax', 'tax', 'ph-light ph-percent', 'range', { id: 'Rekap PPN', en: 'VAT Summary' }, { id: 'PPN keluaran dan masukan untuk SPT Masa.', en: 'Output and input VAT for the monthly return.' }),
  r('pph23', 'tax', 'tax', 'ph-light ph-file-text', 'range', { id: 'Rekap PPh 23', en: 'WHT Art. 23 Summary' }, { id: 'Pemotongan PPh 23 atas jasa dan sewa.', en: 'Art. 23 withholding on services and rent.' }),
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

const a = (code: string, t: string, cur: number, prev: number): ReportRow => ({ k: 'acc', code, t, cur, prev })
const neraca: ReportRow[] = [
  { k: 'sec', t: 'Aset' },
  { k: 'grp', t: 'Aset Lancar' },
  a('1-1100', 'Kas', 48_250_000, 41_900_000),
  a('1-1200', 'Bank BCA', 612_480_000, 538_120_000),
  a('1-1210', 'Bank Mandiri', 214_300_000, 255_760_000),
  a('1-1300', 'Piutang Usaha', 386_920_000, 342_150_000),
  a('1-1400', 'Persediaan Barang', 524_610_000, 498_300_000),
  a('1-1500', 'Uang Muka Pajak', 22_450_000, 18_200_000),
  { k: 'sub', t: 'Total Aset Lancar', cur: 1_809_010_000, prev: 1_694_430_000 },
  { k: 'grp', t: 'Aset Tidak Lancar' },
  a('1-2100', 'Peralatan Kantor', 186_000_000, 186_000_000),
  a('1-2200', 'Kendaraan', 420_000_000, 420_000_000),
  a('1-2900', 'Akumulasi Penyusutan', -158_750_000, -132_500_000),
  { k: 'sub', t: 'Total Aset Tidak Lancar', cur: 447_250_000, prev: 473_500_000 },
  { k: 'tot', t: 'Total Aset', cur: 2_256_260_000, prev: 2_167_930_000 },
  { k: 'sec', t: 'Liabilitas dan Ekuitas' },
  { k: 'grp', t: 'Liabilitas' },
  a('2-1100', 'Utang Usaha', 298_140_000, 276_400_000),
  a('2-1200', 'Utang PPN', 41_870_000, 38_950_000),
  a('2-1300', 'Biaya Yang Masih Harus Dibayar', 36_500_000, 32_000_000),
  a('2-2100', 'Utang Bank Jangka Panjang', 350_000_000, 375_000_000),
  { k: 'sub', t: 'Total Liabilitas', cur: 726_510_000, prev: 722_350_000 },
  { k: 'grp', t: 'Ekuitas' },
  a('3-1000', 'Modal Disetor', 1_000_000_000, 1_000_000_000),
  a('3-2000', 'Laba Ditahan', 445_580_000, 445_580_000),
  a('3-3000', 'Laba Tahun Berjalan', 84_170_000, 0),
  { k: 'sub', t: 'Total Ekuitas', cur: 1_529_750_000, prev: 1_445_580_000 },
  { k: 'tot', t: 'Total Liabilitas dan Ekuitas', cur: 2_256_260_000, prev: 2_167_930_000 },
]
const labaRugi: ReportRow[] = [
  { k: 'sec', t: 'Pendapatan' },
  a('4-1000', 'Penjualan', 1_284_600_000, 1_152_300_000),
  a('4-1100', 'Retur Penjualan', -18_450_000, -12_900_000),
  a('4-1200', 'Diskon Penjualan', -12_450_000, -10_800_000),
  { k: 'sub', t: 'Pendapatan Bersih', cur: 1_253_700_000, prev: 1_128_600_000 },
  { k: 'sec', t: 'Beban Pokok Penjualan' },
  a('5-1000', 'Harga Pokok Penjualan', 812_350_000, 731_200_000),
  { k: 'tot', t: 'Laba Kotor', cur: 441_350_000, prev: 397_400_000 },
  { k: 'sec', t: 'Beban Operasional' },
  a('6-1000', 'Beban Gaji', 168_000_000, 162_000_000),
  a('6-1100', 'Beban Sewa', 54_000_000, 54_000_000),
  a('6-1200', 'Beban Listrik & Air', 12_840_000, 11_960_000),
  a('6-1300', 'Beban Pemasaran', 38_620_000, 29_450_000),
  a('6-1400', 'Beban Penyusutan', 26_250_000, 26_250_000),
  a('6-1900', 'Beban Lain-lain', 9_470_000, 8_120_000),
  { k: 'sub', t: 'Total Beban Operasional', cur: 309_180_000, prev: 291_780_000 },
  { k: 'sec', t: 'Pendapatan & Beban Lain' },
  a('7-1000', 'Pendapatan Bunga', 3_250_000, 2_980_000),
  a('8-1000', 'Beban Bunga Bank', -9_450_000, -10_200_000),
  { k: 'sub', t: 'Total Lain-lain', cur: -6_200_000, prev: -7_220_000 },
  { k: 'tot', t: 'Laba Bersih Sebelum Pajak', cur: 125_970_000, prev: 98_400_000 },
  a('9-1000', 'Beban Pajak Penghasilan', -41_800_000, -32_600_000),
  { k: 'tot', t: 'Laba Bersih', cur: 84_170_000, prev: 65_800_000 },
]
const names: Record<string, string[]> = {
  sales: ['PT Sinar Pesisir', 'CV Maju Bersama', 'PT Laut Biru Logistik', 'Toko Sentosa', 'PT Andalas Retail'],
  buy: ['PT Samudra Pangan', 'CV Kertas Jaya', 'PT Mitra Teknik', 'UD Sumber Rejeki'],
  ar: ['PT Sinar Pesisir', 'CV Maju Bersama', 'Toko Sentosa', 'PT Andalas Retail'],
  ap: ['PT Samudra Pangan', 'PT Mitra Teknik', 'CV Kertas Jaya'],
  inv: ['Beras Premium 5 kg', 'Minyak Goreng 2 L', 'Gula Pasir 1 kg', 'Kopi Bubuk 250 g', 'Teh Celup 25s'],
  fa: ['Laptop Kantor', 'Mobil Operasional', 'Rak Gudang', 'AC Ruang Rapat'],
  cash: ['Kas Kecil', 'Bank BCA', 'Bank Mandiri'],
  tax: ['Oktober 2026', 'September 2026', 'Agustus 2026'],
  gl: ['Kas', 'Bank BCA', 'Piutang Usaha', 'Persediaan Barang', 'Utang Usaha', 'Penjualan'],
}
function generic(rep: Report): ReportRow[] {
  const items = names[rep.cat] ?? names.gl
  const rows = items.map((t, i) => a(`${i + 1}`.padStart(3, '0'), t, 12_450_000 * (items.length - i) + 3_175_000 * i, 10_980_000 * (items.length - i)))
  const sum = (k: 'cur' | 'prev') => rows.reduce((s, x) => s + (x[k] ?? 0), 0)
  return [{ k: 'sec', t: rep.name.id }, ...rows, { k: 'tot', t: 'Total', cur: sum('cur'), prev: sum('prev') }]
}

export const reportRowsQuery = (id: string, key: string) =>
  queryOptions({
    queryKey: ['reports', id, 'rows', key],
    queryFn: () => {
      const rep = reports.find((x) => x.id === id)
      const rows = id === 'neraca' || id === 'neraca-saldo' ? neraca : id.startsWith('laba-rugi') ? labaRugi : rep ? generic(rep) : []
      return mock(rows, 1400)
    },
  })

const answers = [
  'Laba bersih naik 27,9% menjadi Rp 84.170.000 dibanding periode sebelumnya, terutama karena penjualan tumbuh 11,5% sementara beban operasional hanya naik 6,0%.',
  'Beban pemasaran tumbuh paling cepat (+31,1%). Jika tren ini berlanjut, margin operasional bisa turun sekitar 1,2 poin pada kuartal berikutnya.',
  'Rasio lancar saat ini 4,92 — sangat likuid. Kas dan bank sebesar Rp 875.030.000 cukup untuk menutup seluruh liabilitas jangka pendek.',
  'Piutang usaha naik 13,1% sementara penjualan naik 11,5%. Periksa umur piutang: PT Sinar Pesisir menyumbang 38% saldo yang lewat jatuh tempo.',
]
let turn = 0
const now = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
export const aiGreeting = (report: string): AiMessage => ({
  id: 'g',
  bot: true,
  t: `Saya sudah membaca ${report} PT Harbor Nusantara. Secara umum kinerja periode ini sehat: pendapatan dan laba tumbuh, likuiditas kuat. Tanyakan apa saja tentang angka di laporan ini.`,
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
