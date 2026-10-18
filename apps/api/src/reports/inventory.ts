import { fmtDate } from './general-ledger'
import { formatIdr } from './trial-balance'
import { layers } from '../inventory/fifo'

// Persediaan reports over stock_moves; rules in docs/reports/<planId>.md (fixture: fixtures/inventory-t4.json).

export interface StockMove { item: string; date: string; docType: string; docNumber: string; party: string; quantity: number; value: number }
export interface StockItem { no: string; name: string; unit: string }
export interface InventoryData { items: StockItem[]; moves: StockMove[] }

const WAREHOUSE = 'Utama' // single default warehouse
const DOC_LABEL: Record<string, string> = { PI: 'Faktur Pembelian', SI: 'Faktur Penjualan' }
const dayBefore = (iso: string) => new Date(Date.parse(iso + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10)
const qty = (q: number) => formatIdr(Math.round(q * 100))
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
const sum = (xs: StockMove[], f: (m: StockMove) => number) => xs.reduce((s, m) => s + f(m), 0)
const movesOf = (d: InventoryData, item: string) => d.moves.filter(m => m.item === item)

/** Nilai Persediaan: per item by name, opening / in / out / closing quantity and value; total row. */
export function inventoryValuation(d: InventoryData, from: string, to: string): string[][] {
  const row = (ms: StockMove[]) => {
    const before = ms.filter(m => m.date < from), within = ms.filter(m => m.date >= from && m.date <= to)
    const ins = within.filter(m => m.quantity > 0), outs = within.filter(m => m.quantity < 0)
    const oq = sum(before, m => m.quantity), ov = sum(before, m => m.value)
    const iq = sum(ins, m => m.quantity), iv = sum(ins, m => m.value), xq = -sum(outs, m => m.quantity), xv = -sum(outs, m => m.value)
    return [oq, ov, iq, iv, xq, xv, oq + iq - xq, ov + iv - xv]
  }
  const fmt = (r: number[]) => r.map((v, i) => (i % 2 === 0 ? qty(v) : formatIdr(v)))
  const items = [...d.items].sort((a, b) => (a.name < b.name ? -1 : 1))
  const rows = items.map(i => ({ i, r: row(movesOf(d, i.no)) }))
  const total = rows.reduce((t, x) => t.map((v, k) => v + x.r[k]!), new Array(8).fill(0))
  return [['Nama Barang', 'Kode Barang', 'Saldo Awal', 'Masuk', 'Keluar', 'Saldo Akhir'], ['Kuantitas', 'Nilai', 'Kuantitas', 'Nilai', 'Kuantitas', 'Nilai', 'Kuantitas', 'Nilai'],
    ...rows.map(({ i, r }) => [i.name, i.no, ...fmt(r)]), ['Total Nama Barang', ...fmt(total)]]
}

/** Kartu Stok Persediaan for the selected items. */
export function stockCard(d: InventoryData, itemNos: string[], from: string, to: string): string[][] {
  const out: string[][] = []
  for (const no of itemNos) {
    const it = d.items.find(i => i.no === no)!, ms = movesOf(d, no)
    let bal = sum(ms.filter(m => m.date < from), m => m.quantity)
    const prev = fmtDate(dayBefore(from)), within = ms.filter(m => m.date >= from && m.date <= to)
    out.push([`Barang : ${it.name}`], ['Kode Barang', ':', it.no], ['Nama Barang', ':', it.name],
      ['Tanggal', 'Tipe Transaksi', 'Nomor #', 'Deskripsi', 'Kts Masuk', 'Kts Keluar', 'Kts Akhir', 'Gudang'],
      [prev, 'Saldo Awal', `Saldo Awal ${prev}`, '0', '0', qty(bal)])
    for (const m of within) {
      bal += m.quantity
      const desc = m.docType === 'PI' ? `Pembelian dari ${m.party}` : `Penjualan ke ${m.party}`
      out.push([fmtDate(m.date), DOC_LABEL[m.docType]!, m.docNumber, desc, qty(Math.max(m.quantity, 0)), qty(Math.max(-m.quantity, 0)), qty(bal), WAREHOUSE])
    }
    out.push([qty(sum(within.filter(m => m.quantity > 0), m => m.quantity)), qty(-sum(within.filter(m => m.quantity < 0), m => m.quantity))])
  }
  return out
}

/** Rincian Nilai Persediaan for the selected items: quantities and FIFO values with running balance. */
export function valuationDetail(d: InventoryData, itemNos: string[], from: string, to: string): string[][] {
  const out: string[][] = []
  for (const no of itemNos) {
    const it = d.items.find(i => i.no === no)!, ms = movesOf(d, no)
    const before = ms.filter(m => m.date < from), within = ms.filter(m => m.date >= from && m.date <= to)
    let q = sum(before, m => m.quantity), v = sum(before, m => m.value)
    out.push([`Barang : ${it.name}`], ['Kode Barang', ':', it.no], ['Nama Barang', ':', it.name],
      ['Nomor #', 'Tanggal', 'Kts Masuk', 'Nilai Masuk', 'Kts Keluar', 'Nilai Keluar', 'Kts Akhir', 'Nilai Akhir'],
      [fmtDate(dayBefore(from)), '0', '0', '0', '0', qty(q), formatIdr(v)])
    for (const m of within) {
      q += m.quantity; v += m.value
      const inn = m.quantity > 0
      out.push([m.docNumber, fmtDate(m.date), qty(inn ? m.quantity : 0), formatIdr(inn ? m.value : 0), qty(inn ? 0 : -m.quantity), formatIdr(inn ? 0 : -m.value), qty(q), formatIdr(v)])
    }
    const ins = within.filter(m => m.quantity > 0), outs = within.filter(m => m.quantity < 0)
    out.push([qty(sum(ins, m => m.quantity)), formatIdr(sum(ins, m => m.value)), qty(-sum(outs, m => m.quantity)), formatIdr(-sum(outs, m => m.value))])
  }
  return out
}

/** Umur Persediaan: remaining FIFO layers by age (days since the layer's purchase date). */
export function inventoryAging(d: InventoryData, asOf: string): string[][] {
  const bucket = (a: number) => (a <= 30 ? 0 : a <= 60 ? 1 : a <= 90 ? 2 : a <= 120 ? 3 : 4)
  return [['Nama Barang', 'Stok', '1 - 30', '31 - 60', '61 - 90', '91 - 120', '&gt; 120'],
    ...[...d.items].sort((a, b) => (a.name < b.name ? -1 : 1)).map(i => {
      const ls = layers(movesOf(d, i.no).filter(m => m.date <= asOf)), b = [0, 0, 0, 0, 0]
      for (const l of ls) b[bucket(days(l.date, asOf))]! += l.qty
      return [i.name, qty(ls.reduce((s, l) => s + l.qty, 0)), ...b.map(qty)]
    })]
}

/** Profitabilitas per Barang: sales, FIFO cost of goods sold, margin, for items sold in the range. */
export function profitabilityByItem(d: InventoryData, sales: { item: string; date: string; total: number }[], from: string, to: string): string[][] {
  const inRange = (x: { date: string }) => x.date >= from && x.date <= to
  const rows = [...d.items].sort((a, b) => (a.name < b.name ? -1 : 1)).map(i => {
    const s = sales.filter(x => x.item === i.no && inRange(x)).reduce((t, x) => t + x.total, 0)
    const c = -sum(movesOf(d, i.no).filter(m => m.docType === 'SI' && inRange(m)), m => m.value)
    return { name: i.name, s, c }
  }).filter(r => r.s)
  const t = rows.reduce((a, r) => ({ s: a.s + r.s, c: a.c + r.c }), { s: 0, c: 0 })
  const line = (n: string, s: number, c: number) => [n, formatIdr(s), formatIdr(c), '0', '0', formatIdr(s - c)]
  return [['Nama Barang', 'Penjualan', 'BPP', 'Biaya Tambahan', 'Biaya Penerimaan', 'Laba setelah Biaya'], ...rows.map(r => line(r.name, r.s, r.c)), line('Total Nama Barang', t.s, t.c)]
}
