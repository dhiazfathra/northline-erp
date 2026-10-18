import { fmtDate } from './general-ledger'
import { formatIdr } from './trial-balance'

// Aset Tetap reports; rules in docs/reports/FixedAsset*.md (fixture: fixtures/fixed-asset-t5.json).

export interface Asset {
  number: string; description: string; category: string; date: string; usageDate: string; lifeMonths: number; cost: number
  expenseAccount: string; accumulatedAccount: string
  expenditures: { name: string; date: string; amount: number }[]
  depreciations: { period: string; date: string; jvNumber: string; periodEndNumber: string; amount: number }[]
}

const METHOD = 'Metode Garis Lurus'
const PE_LABEL = 'Proses Akhir Bulan (Penyusutan)'
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
const dayBefore = (iso: string) => new Date(Date.parse(iso + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10)
const accumulated = (a: Asset, asOf: string) => a.depreciations.filter(d => d.date <= asOf).reduce((s, d) => s + d.amount, 0)
const life = (a: Asset) => [String(Math.floor(a.lifeMonths / 12)), String(a.lifeMonths % 12)] as const

/** Daftar Aset Tetap: grouped by tangibility ("Berwujud"; intangible assets not modelled), cost, depreciation to date, book value; totals. */
export function fixedAssetList(assets: Asset[], asOf: string): string[][] {
  return byCategory(assets.map(a => ({ ...a, category: 'Berwujud' })), a => { const acc = accumulated(a, asOf); return [a.number, a.description, formatIdr(a.cost), formatIdr(acc), formatIdr(a.cost - acc), fmtDate(a.usageDate), fmtDate(a.date)] },
    xs => [formatIdr(xs.reduce((s, a) => s + a.cost, 0)), formatIdr(xs.reduce((s, a) => s + accumulated(a, asOf), 0)), formatIdr(xs.reduce((s, a) => s + a.cost - accumulated(a, asOf), 0))],
    ['Nomor #', 'Nama Aset', 'Total Aset', 'Penyusutan', 'Nilai Buku', 'Tanggal Pakai', 'Tanggal Beli'])
}

/** Aset Tetap per Kategori: as the list plus depreciation of the current year. */
export function fixedAssetByCategory(assets: Asset[], asOf: string): string[][] {
  const year = (a: Asset) => a.depreciations.filter(d => d.date <= asOf && d.date.startsWith(asOf.slice(0, 4))).reduce((s, d) => s + d.amount, 0)
  return byCategory(assets, a => { const acc = accumulated(a, asOf); return [a.number, a.description, formatIdr(a.cost), formatIdr(acc), formatIdr(year(a)), formatIdr(a.cost - acc), fmtDate(a.usageDate), fmtDate(a.date)] },
    xs => [formatIdr(xs.reduce((s, a) => s + a.cost, 0)), formatIdr(xs.reduce((s, a) => s + accumulated(a, asOf), 0)), formatIdr(xs.reduce((s, a) => s + year(a), 0)), formatIdr(xs.reduce((s, a) => s + a.cost - accumulated(a, asOf), 0))],
    ['Nomor #', 'Nama Aset', 'Total Aset', 'Penyusutan', 'Penyusutan Tahun ini', 'Nilai Buku', 'Tanggal Pakai', 'Tanggal Beli'])
}

function byCategory(assets: Asset[], row: (a: Asset) => string[], total: (xs: Asset[]) => string[], head: string[]): string[][] {
  const out = [head]
  for (const c of [...new Set(assets.map(a => a.category))].sort()) {
    const xs = assets.filter(a => a.category === c).sort((a, b) => (a.number < b.number ? -1 : 1))
    out.push([c], ...xs.map(row), total(xs))
  }
  return out
}

/** Histori Aset for one asset: acquisition and each depreciation with running book value. */
export function fixedAssetHistory(a: Asset, from: string, to: string): string[][] {
  const [years, months] = life(a)
  const out: string[][] = [[`Aset Tetap : ${a.description}`], ['Nomor #', ':', a.number, 'Umur (Tahun)', ':', years], ['Tanggal', ':', fmtDate(a.date), 'Umur (Bulan)', ':', months],
    ['Metode Penyusutan', ':', METHOD], ['Tanggal', 'No.', 'Keterangan', 'Total Aset', 'Akumulasi Penyusutan', 'Nilai Buku', 'Biaya Penyusutan', 'Laba/Rugi']]
  const opening = a.date < from ? a.cost - accumulated(a, dayBefore(from)) : 0
  out.push([fmtDate(dayBefore(from)), 'Saldo Awal', '0', '0', formatIdr(opening), '0', '0'])
  let book = opening, prev = a.date
  if (a.date >= from && a.date <= to) { book += a.cost; out.push([fmtDate(a.date), a.number, 'Aset Tetap', formatIdr(a.cost), '0', formatIdr(book), '0', '0']) }
  for (const d of a.depreciations) {
    if (d.date >= from && d.date <= to) {
      book -= d.amount
      out.push([fmtDate(d.date), d.jvNumber, `Penyusutan Aset ${a.number}, ${dmy(prev)} sampai ${dmy(d.date)}`, '0', formatIdr(d.amount), formatIdr(book), formatIdr(-d.amount), '0'])
    }
    prev = d.date
  }
  return out
}

/** Jurnal Aset for one asset: its depreciation journal lines (the acquisition journal is not listed). */
export function fixedAssetJournal(a: Asset): string[][] {
  return [[`Aset Tetap : ${a.description}`], ['Kode Aset', ':', a.number, 'Tanggal Pakai', ':', fmtDate(a.usageDate)], ['Tanggal Beli', ':', fmtDate(a.date)],
    ['Tanggal', 'No. Trans #', 'Tipe Transaksi', 'Kode Perkiraan', 'Debit', 'Kredit'],
    ...a.depreciations.flatMap(d => [[fmtDate(d.date), d.periodEndNumber, PE_LABEL, a.expenseAccount, formatIdr(d.amount), '0'], [fmtDate(d.date), d.periodEndNumber, PE_LABEL, a.accumulatedAccount, '0', formatIdr(d.amount)]])]
}

/** Detail Aset Tetap for one asset: its expenditures. */
export function fixedAssetDetail(a: Asset): string[][] {
  const [years, months] = life(a)
  return [[`Aset Tetap : ${a.description}`], ['Kode Aset', ':', a.number, 'Umur (Tahun)', ':', years], ['Tanggal Beli', ':', fmtDate(a.date), 'Umur (Bulan)', ':', months], ['Metode Penyusutan', ':', METHOD],
    ['Nama Biaya', 'Tanggal', 'Tipe Transaksi', 'Jumlah', 'Kode Aset', 'Tanggal Beli', 'Metode Penyusutan', 'Umur (Tahun)', 'Umur (Bulan)'],
    ...a.expenditures.map(e => [e.name, fmtDate(e.date), 'Pengeluaran', formatIdr(e.amount), a.number, fmtDate(a.date), METHOD, years, months])]
}
