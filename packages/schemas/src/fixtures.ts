// Canonical S0–S8 fixture ledger from the design's Flow Boards / Changes Board (docs/design-boards.md).
// Every screen derives its numbers from these journals so lists, journals and reports agree.

export type AccountType =
  | 'Kas & Bank'
  | 'Piutang Usaha'
  | 'Persediaan'
  | 'Aset Lancar Lainnya'
  | 'Aset Tetap'
  | 'Akumulasi Penyusutan'
  | 'Utang Usaha'
  | 'Liabilitas Jangka Pendek'
  | 'Ekuitas'
  | 'Pendapatan'
  | 'Beban Pokok Penjualan'
  | 'Beban'
  | 'Pendapatan Lain'
  | 'Beban Lain'

export interface Account {
  code: string
  name: string
  type: AccountType
  /** Parent code for sub-accounts; parents carry the sum of their children. */
  parent?: string
  /** Natural balance side. */
  normal: 'D' | 'K'
  /** Contra accounts render with a leading "-". */
  contra?: boolean
}

export const accounts: Account[] = [
  { code: '1100', name: 'Kas dan Setara Kas', type: 'Kas & Bank', normal: 'D' },
  { code: '1101', name: 'Bank Uji', type: 'Kas & Bank', parent: '1100', normal: 'D' },
  { code: '1102', name: 'Kas Kecil', type: 'Kas & Bank', parent: '1100', normal: 'D' },
  { code: '1103', name: 'Bank USD', type: 'Kas & Bank', parent: '1100', normal: 'D' },
  { code: '110301', name: 'Piutang Usaha', type: 'Piutang Usaha', normal: 'D' },
  { code: '110401', name: 'Persediaan Barang', type: 'Persediaan', normal: 'D' },
  { code: '110501', name: 'PPN Masukan', type: 'Aset Lancar Lainnya', normal: 'D' },
  { code: '1200', name: 'Aset Tetap', type: 'Aset Tetap', normal: 'D' },
  { code: '1201', name: 'Peralatan Kantor', type: 'Aset Tetap', parent: '1200', normal: 'D' },
  { code: '1202', name: 'Akumulasi Penyusutan Peralatan', type: 'Akumulasi Penyusutan', parent: '1200', normal: 'K', contra: true },
  { code: '210101', name: 'Utang Usaha', type: 'Utang Usaha', normal: 'K' },
  { code: '210102', name: 'Uang Muka Penjualan', type: 'Liabilitas Jangka Pendek', normal: 'K' },
  { code: '210201', name: 'PPN Keluaran', type: 'Liabilitas Jangka Pendek', normal: 'K' },
  { code: '210301', name: 'Utang PPh 23', type: 'Liabilitas Jangka Pendek', normal: 'K' },
  { code: '3001', name: 'Modal Uji', type: 'Ekuitas', normal: 'K' },
  { code: '300001', name: 'Ekuitas Saldo Awal', type: 'Ekuitas', normal: 'K' },
  { code: '4000', name: 'Pendapatan Operasional', type: 'Pendapatan', normal: 'K' },
  { code: '4001', name: 'Pendapatan Jasa', type: 'Pendapatan', parent: '4000', normal: 'K' },
  { code: '400001', name: 'Penjualan', type: 'Pendapatan', parent: '4000', normal: 'K' },
  { code: '400004', name: 'Diskon Penjualan', type: 'Pendapatan', parent: '4000', normal: 'K', contra: true },
  { code: '400005', name: 'Retur Penjualan', type: 'Pendapatan', parent: '4000', normal: 'K', contra: true },
  { code: '440101', name: 'Diskon Penjualan IDR', type: 'Pendapatan', normal: 'K', contra: true },
  { code: '510101', name: 'Beban Pokok Penjualan', type: 'Beban Pokok Penjualan', normal: 'D' },
  { code: '6000', name: 'Beban Operasional', type: 'Beban', normal: 'D' },
  { code: '6001', name: 'Beban Umum & Sewa', type: 'Beban', parent: '6000', normal: 'D' },
  { code: '6002', name: 'Beban Jasa Profesional', type: 'Beban', parent: '6000', normal: 'D' },
  { code: '6101', name: 'Beban Penyusutan', type: 'Beban', parent: '6000', normal: 'D' },
  { code: '720102', name: 'Laba Selisih Kurs Terealisasi', type: 'Pendapatan Lain', normal: 'K' },
  { code: '7201', name: 'Rugi Pelepasan Aset Tetap', type: 'Beban Lain', normal: 'D' },
]

export const leafAccounts = accounts.filter((a) => !accounts.some((c) => c.parent === a.code))

export type SourceType =
  | 'Jurnal Umum'
  | 'Penyesuaian Persediaan'
  | 'Faktur Penjualan'
  | 'Uang Muka Penjualan'
  | 'Penerimaan Penjualan'
  | 'Faktur Pembelian'
  | 'Pembayaran Pembelian'
  | 'Retur Pembelian'
  | 'Retur Penjualan'
  | 'Pembayaran'
  | 'Aset Tetap'

export interface JournalLine {
  account: string
  debit: number
  credit: number
  memo?: string
}

export interface Journal {
  /** Journal voucher number shown in Jurnal Umum (system journals carry their own JV number). */
  jv: string
  /** Source document number (SI/PI/IA/…); equals `jv` for manual journals. */
  no: string
  date: string // dd/mm/yyyy
  source: SourceType
  scenario: 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8'
  description: string
  lines: JournalLine[]
}

const dr = (account: string, amount: number, memo?: string): JournalLine => ({ account, debit: amount, credit: 0, memo })
const cr = (account: string, amount: number, memo?: string): JournalLine => ({ account, debit: 0, credit: amount, memo })

export const journals: Journal[] = [
  // S7 · fixed asset, September
  { jv: 'JV.2026.09.00001', no: 'FA.2026.09.00001', date: '01/09/2026', source: 'Aset Tetap', scenario: 'S7', description: 'Saldo awal aset Laptop Uji', lines: [dr('1201', 12_000_000), cr('300001', 12_000_000)] },
  { jv: 'JV.2026.09.00002', no: 'FA.2026.09.00001', date: '30/09/2026', source: 'Aset Tetap', scenario: 'S7', description: 'Penyusutan September Laptop Uji', lines: [dr('6101', 250_000), cr('1202', 250_000)] },
  { jv: 'JV.2026.09.00003', no: 'FA.2026.09.00001', date: '30/09/2026', source: 'Aset Tetap', scenario: 'S7', description: 'Pelepasan Laptop Uji', lines: [dr('1202', 250_000), dr('7201', 11_750_000), cr('1201', 12_000_000)] },
  // S0 · manual journals
  { jv: 'JV.2026.10.00001', no: 'JV.2026.10.00001', date: '01/10/2026', source: 'Jurnal Umum', scenario: 'S0', description: 'Setoran modal', lines: [dr('1101', 10_000_000), cr('3001', 10_000_000)] },
  { jv: 'JV.2026.10.00002', no: 'JV.2026.10.00002', date: '02/10/2026', source: 'Jurnal Umum', scenario: 'S0', description: 'Bayar sewa', lines: [dr('6001', 2_000_000), cr('1101', 2_000_000)] },
  { jv: 'JV.2026.10.00003', no: 'JV.2026.10.00003', date: '03/10/2026', source: 'Jurnal Umum', scenario: 'S0', description: 'Pendapatan jasa', lines: [dr('1101', 5_000_000), cr('4001', 5_000_000)] },
  { jv: 'JV.2026.10.00004', no: 'JV.2026.10.00004', date: '04/10/2026', source: 'Jurnal Umum', scenario: 'S0', description: 'Biaya operasional dan isi kas kecil', lines: [dr('6001', 1_000_000), dr('1102', 500_000), cr('1101', 1_500_000)] },
  // S1 · order to cash with PPN
  { jv: 'JV.2026.10.00006', no: 'IA.2026.10.00002', date: '05/10/2026', source: 'Penyesuaian Persediaan', scenario: 'S1', description: 'Barang A 5 @ 120.000', lines: [dr('110401', 600_000), cr('300001', 600_000)] },
  { jv: 'JV.2026.10.00007', no: 'SI.2026.10.00001', date: '06/10/2026', source: 'Faktur Penjualan', scenario: 'S1', description: 'Barang A 5 × 200.000, diskon 10%', lines: [dr('110301', 949_050), dr('400004', 100_000), dr('440101', 45_000), cr('400001', 1_000_000), cr('210201', 94_050), dr('510101', 600_000), cr('110401', 600_000)] },
  { jv: 'JV.2026.10.00008', no: '1101.2026.10.00001', date: '08/10/2026', source: 'Penerimaan Penjualan', scenario: 'S1', description: 'Pelunasan SI.2026.10.00001', lines: [dr('1101', 949_050), cr('110301', 949_050)] },
  // S2 · purchase with PPh 23
  { jv: 'JV.2026.10.00009', no: 'PI.2026.10.00001', date: '07/10/2026', source: 'Faktur Pembelian', scenario: 'S2', description: 'Jasa konsultan', lines: [dr('6002', 1_000_000), dr('110501', 110_000), cr('210101', 1_110_000)] },
  { jv: 'JV.2026.10.00010', no: '1101.2026.10.00002', date: '09/10/2026', source: 'Pembayaran Pembelian', scenario: 'S2', description: 'Pelunasan PI.2026.10.00001, dipotong PPh 23', lines: [dr('210101', 1_110_000), cr('1101', 1_070_000), cr('210301', 40_000)] },
  // S3 · inventory FIFO
  { jv: 'JV.2026.10.00005', no: 'IA.2026.10.00001', date: '05/10/2026', source: 'Penyesuaian Persediaan', scenario: 'S3', description: 'Barang B 5 @ 120.000', lines: [dr('110401', 600_000), cr('300001', 600_000)] },
  { jv: 'JV.2026.10.00011', no: 'PI.2026.10.00002', date: '10/10/2026', source: 'Faktur Pembelian', scenario: 'S3', description: 'Barang B 5 @ 150.000', lines: [dr('110401', 750_000), cr('210101', 750_000)] },
  { jv: 'JV.2026.10.00015', no: 'SI.2026.10.00002', date: '11/10/2026', source: 'Faktur Penjualan', scenario: 'S3', description: 'Barang B 7 @ 200.000', lines: [dr('110301', 1_400_000), cr('400001', 1_400_000), dr('510101', 900_000), cr('110401', 900_000)] },
  // S4 · down payment
  { jv: 'JV.2026.10.00016', no: 'SI.2026.10.00003', date: '12/10/2026', source: 'Uang Muka Penjualan', scenario: 'S4', description: 'Uang muka jasa, termasuk pajak', lines: [dr('110301', 1_110_000), cr('210102', 1_000_000), cr('210201', 110_000)] },
  { jv: 'JV.2026.10.00017', no: '1101.2026.10.00003', date: '12/10/2026', source: 'Penerimaan Penjualan', scenario: 'S4', description: 'Penerimaan uang muka SI.2026.10.00003', lines: [dr('1101', 1_110_000), cr('110301', 1_110_000)] },
  { jv: 'JV.2026.10.00018', no: 'SI.2026.10.00004', date: '13/10/2026', source: 'Faktur Penjualan', scenario: 'S4', description: 'Jasa 2 × 1.000.000, uang muka dipakai', lines: [dr('110301', 2_220_000), cr('400001', 2_000_000), cr('210201', 220_000), dr('210102', 1_000_000), dr('210201', 110_000), cr('110301', 1_110_000)] },
  // S5 · foreign currency
  { jv: 'JV.2026.10.00019', no: 'SI.2026.10.00005', date: '14/10/2026', source: 'Faktur Penjualan', scenario: 'S5', description: 'USD 100 @ 15.000', lines: [dr('110301', 1_500_000), cr('400001', 1_500_000)] },
  { jv: 'JV.2026.10.00020', no: '1103.2026.10.00001', date: '15/10/2026', source: 'Penerimaan Penjualan', scenario: 'S5', description: 'Pelunasan SI.2026.10.00005 @ 15.500', lines: [dr('1103', 1_550_000), cr('110301', 1_500_000), cr('720102', 50_000)] },
  // S6 · bank charge
  { jv: 'JV.2026.10.00021', no: '1101.2026.10.00004', date: '15/10/2026', source: 'Pembayaran', scenario: 'S6', description: 'Biaya administrasi bank', lines: [dr('6001', 25_000), cr('1101', 25_000)] },
  // S8 · returns
  { jv: 'JV.2026.10.00022', no: 'PRT.2026.10.00001', date: '16/10/2026', source: 'Retur Pembelian', scenario: 'S8', description: 'Retur Barang B 1 @ 150.000 atas PI.2026.10.00002', lines: [dr('210101', 150_000), cr('110401', 150_000)] },
  { jv: 'JV.2026.10.00023', no: 'SI.2026.10.00006', date: '16/10/2026', source: 'Faktur Penjualan', scenario: 'S8', description: 'Barang B 1 @ 200.000', lines: [dr('110301', 200_000), cr('400001', 200_000), dr('510101', 150_000), cr('110401', 150_000)] },
  { jv: 'JV.2026.10.00014', no: 'SRT.2026.10.00001', date: '17/10/2026', source: 'Retur Penjualan', scenario: 'S8', description: 'Retur SI.2026.10.00006 (barang rusak, tidak masuk stok)', lines: [dr('400005', 200_000), cr('110301', 200_000)] },
]

// ---- derivations ----

export const parseDate = (d: string) => {
  const [dd, mm, yyyy] = d.split('/').map(Number)
  return new Date(yyyy, mm - 1, dd).getTime()
}

/** Signed balance per account (debit positive) for journals within [from, to]. */
export function balances(from = '01/01/2000', to = '17/10/2026') {
  const a = parseDate(from)
  const b = parseDate(to)
  const out = new Map<string, number>()
  for (const j of journals) {
    const t = parseDate(j.date)
    if (t < a || t > b) continue
    for (const l of j.lines) out.set(l.account, (out.get(l.account) ?? 0) + l.debit - l.credit)
  }
  return out
}

/** Balance in the account's natural direction, parents rolled up from children. */
export function naturalBalance(code: string, bal = balances()): number {
  const acc = accounts.find((x) => x.code === code)!
  const kids = accounts.filter((x) => x.parent === code)
  if (kids.length) return kids.reduce((s, k) => s + signedFor(acc, k, bal), 0)
  const raw = bal.get(code) ?? 0
  return acc.normal === 'D' ? raw : -raw
}

// child amount expressed in the parent's direction (contra children subtract)
function signedFor(parent: Account, child: Account, bal: Map<string, number>) {
  const raw = bal.get(child.code) ?? 0
  return parent.normal === 'D' ? raw : -raw
}

export function profitAndLoss(bal = balances()) {
  const nat = (c: string) => naturalBalance(c, bal)
  const pendapatanOperasional = nat('4000')
  // 440101 sits outside the parent; its natural (credit) balance is negative.
  const revenue = pendapatanOperasional + nat('440101')
  const cogs = nat('510101')
  const grossProfit = revenue - cogs
  const opex = nat('6000')
  const otherIncome = nat('720102')
  const otherExpense = nat('7201')
  const netIncome = grossProfit - opex + otherIncome - otherExpense
  return { pendapatanOperasional, revenue, cogs, grossProfit, opex, otherIncome, otherExpense, netIncome }
}

export function balanceSheet(bal = balances()) {
  const nat = (c: string) => naturalBalance(c, bal)
  const assets = nat('1100') + nat('110301') + nat('110401') + nat('110501') + nat('1200')
  const liabilities = nat('210101') + nat('210102') + nat('210201') + nat('210301')
  const currentEarnings = profitAndLoss(bal).netIncome
  const equity = nat('3001') + nat('300001') + currentEarnings
  return { cash: nat('1100'), assets, liabilities, equity, currentEarnings }
}

/** Trial balance on leaf accounts only (parents excluded), closing debit/credit totals. */
export function trialBalanceTotals(bal = balances()) {
  let debit = 0
  let credit = 0
  for (const a of leafAccounts) {
    const v = bal.get(a.code) ?? 0
    if (v > 0) debit += v
    else credit -= v
  }
  return { debit, credit }
}

export const idr = (n: number) => (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('en-US')

// ---- master data (seed.yaml, prefix stripped; IDs are a design proposal) ----

export const customers = [
  { id: 'C.00001', name: 'PT Pelanggan Uji', npwp: '01.234.567.8-901.000', currency: 'IDR', terms: 'Net 30' },
  { id: 'C.00002', name: 'CV Jasa Mandiri', npwp: '02.345.678.9-012.000', currency: 'IDR', terms: 'Net 14' },
  { id: 'C.00003', name: 'Global Trade Ltd', npwp: '', currency: 'USD', terms: 'Net 30' },
]

export const vendors = [
  { id: 'V.00001', name: 'PT Konsultan Uji', npwp: '', currency: 'IDR', terms: 'Net 30', pph23: true },
  { id: 'V.00002', name: 'PT Pemasok Barang', npwp: '03.456.789.0-123.000', currency: 'IDR', terms: 'Net 30', pph23: false },
  { id: 'V.00003', name: 'CV Alat Kantor', npwp: '04.567.890.1-234.000', currency: 'IDR', terms: 'COD', pph23: false },
]

export const items = [
  { code: 'BRG-A', name: 'Barang A', kind: 'Persediaan' as const, unit: 'PCS', sellPrice: 200_000, buyPrice: 120_000 },
  { code: 'BRG-B', name: 'Barang B', kind: 'Persediaan' as const, unit: 'PCS', sellPrice: 200_000, buyPrice: 150_000 },
  { code: 'JSA-01', name: 'Jasa', kind: 'Jasa' as const, unit: 'JAM', sellPrice: 1_000_000, buyPrice: 0 },
  { code: 'JSA-KNS', name: 'Jasa Konsultan', kind: 'Jasa' as const, unit: 'JAM', sellPrice: 0, buyPrice: 1_000_000 },
]

export const taxes = [
  { code: 'PPN', name: 'PPN 11%', rate: 11, salesAccount: '210201', purchaseAccount: '110501' },
  { code: 'PPH23', name: 'PPh 23 (tanpa NPWP)', rate: 4, salesAccount: '', purchaseAccount: '210301' },
]
