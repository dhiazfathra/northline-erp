import { fmtDate } from './general-ledger'
import { formatIdr } from './trial-balance'
import { layers } from '../inventory/fifo'

// Persediaan reports over stock_moves; rules in docs/reports/<planId>.md (fixture: fixtures/inventory-t4.json).

export interface StockMove { item: string; date: string; docType: string; docNumber: string; party: string; quantity: number; value: number }
export interface StockItem { no: string; name: string; unit: string }
export interface InventoryData { items: StockItem[]; moves: StockMove[] }

const WAREHOUSE = 'Utama' // single default warehouse
const DOC_LABEL: Record<string, string> = { PI: 'Faktur Pembelian', SI: 'Faktur Penjualan', SRT: 'Retur Penjualan', PRT: 'Retur Pembelian' }
/** Generated movement description ("Pembelian dari <vendor>", "Retur ke <vendor>", …). */
const DESC: Record<string, string> = { PI: 'Pembelian dari', SI: 'Penjualan ke', SRT: 'Retur dari', PRT: 'Retur ke' }
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
      [prev, 'Saldo Awal', `Saldo Awal ${prev}`, qty(bal), '0', qty(bal)])
    for (const m of within) {
      bal += m.quantity
      const desc = `${DESC[m.docType]} ${m.party}`
      out.push([fmtDate(m.date), DOC_LABEL[m.docType]!, m.docNumber, desc, qty(Math.max(m.quantity, 0)), qty(Math.max(-m.quantity, 0)), qty(bal), WAREHOUSE])
    }
    // like the opening row, the totals count the opening balance as an inflow
    out.push([qty(sum(ms.filter(m => m.date < from), m => m.quantity) + sum(within.filter(m => m.quantity > 0), m => m.quantity)), qty(-sum(within.filter(m => m.quantity < 0), m => m.quantity))])
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
      [fmtDate(dayBefore(from)), qty(q), formatIdr(v), '0', '0', qty(q), formatIdr(v)])
    for (const m of within) {
      q += m.quantity; v += m.value
      const inn = m.quantity > 0
      out.push([m.docNumber, fmtDate(m.date), qty(inn ? m.quantity : 0), formatIdr(inn ? m.value : 0), qty(inn ? 0 : -m.quantity), formatIdr(inn ? 0 : -m.value), qty(q), formatIdr(v)])
    }
    // totals count the opening balance as an inflow, like the opening row
    const ins = within.filter(m => m.quantity > 0), outs = within.filter(m => m.quantity < 0)
    out.push([qty(sum(before, m => m.quantity) + sum(ins, m => m.quantity)), formatIdr(sum(before, m => m.value) + sum(ins, m => m.value)), qty(-sum(outs, m => m.quantity)), formatIdr(-sum(outs, m => m.value))])
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

// ---- warehouse views (single warehouse "Utama") ----
const moveDesc = (m: StockMove) => `${DESC[m.docType]} ${m.party}`
const active = (d: InventoryData, from: string, to: string) =>
  [...d.items].sort((a, b) => (a.name < b.name ? -1 : 1)).filter(i => movesOf(d, i.no).some(m => m.date >= from && m.date <= to))

function mutationBlock(d: InventoryData, no: string, from: string, to: string): string[][] {
  const ms = movesOf(d, no), within = ms.filter(m => m.date >= from && m.date <= to)
  let bal = sum(ms.filter(m => m.date < from), m => m.quantity)
  const rows: string[][] = [[`Saldo Barang per ${fmtDate(dayBefore(from))}`, '0', '0', qty(bal)]]
  for (const m of within) { bal += m.quantity; rows.push([m.docNumber, fmtDate(m.date), moveDesc(m), qty(Math.max(m.quantity, 0)), qty(Math.max(-m.quantity, 0)), qty(bal)]) }
  rows.push([qty(sum(within.filter(m => m.quantity > 0), m => m.quantity)), qty(-sum(within.filter(m => m.quantity < 0), m => m.quantity))])
  return rows
}

/** Mutasi per Barang: per selected item, its movements under each warehouse. */
export function itemMutationByWarehouse(d: InventoryData, itemNos: string[], from: string, to: string): string[][] {
  return itemNos.flatMap(no => { const it = d.items.find(i => i.no === no)!
    return [[`Barang : ${it.name}`], ['Kode Barang Barang & Jasa', ':', it.no], ['Nama Barang', ':', it.name], ['Nomor #', 'Tanggal', 'Deskripsi', 'Masuk', 'Keluar', 'Saldo'], [WAREHOUSE], ...mutationBlock(d, no, from, to)] })
}

/** Mutasi per Gudang: per warehouse, every item with movements; warehouse total of in/out last. */
export function warehouseMutationByItem(d: InventoryData, from: string, to: string): string[][] {
  const items = active(d, from, to), within = d.moves.filter(m => m.date >= from && m.date <= to)
  return [[`Gudang : ${WAREHOUSE}`], ['Gudang'], ['Deskripsi'], [':'], [':'], [WAREHOUSE], ['Nomor #', 'Tanggal', 'Deskripsi', 'Masuk', 'Keluar', 'Saldo'],
    ...items.flatMap(i => [[i.name], ...mutationBlock(d, i.no, from, to)]),
    [qty(sum(within.filter(m => m.quantity > 0), m => m.quantity)), qty(-sum(within.filter(m => m.quantity < 0), m => m.quantity))]]
}

/** Ringkasan Mutasi Gudang: per item with movements: opening, in, out, closing quantity; totals. */
export function warehouseMutationSummary(d: InventoryData, from: string, to: string): string[][] {
  const rows = active(d, from, to).map(i => {
    const ms = movesOf(d, i.no), w = ms.filter(m => m.date >= from && m.date <= to)
    const o = sum(ms.filter(m => m.date < from), m => m.quantity), inn = sum(w.filter(m => m.quantity > 0), m => m.quantity), out = -sum(w.filter(m => m.quantity < 0), m => m.quantity)
    return { name: i.name, r: [o, inn, out, o + inn - out] }
  })
  const t = rows.reduce((a, x) => a.map((v, k) => v + x.r[k]!), [0, 0, 0, 0])
  return [[`Gudang : ${WAREHOUSE}`], ['Nama Barang Barang & Jasa', 'Saldo Awal', 'Masuk', 'Keluar', 'Saldo Akhir'], [WAREHOUSE], ...rows.map(x => [x.name, ...x.r.map(qty)]), t.map(qty)]
}

/** Kuantitas Barang per Gudang: quantity and FIFO value per item, per warehouse and total. */
export function quantityByWarehouse(d: InventoryData, asOf: string): string[][] {
  return [['Nama Barang', WAREHOUSE, 'Total Nama Gudang'], ['Kuantitas', 'Total Biaya', 'Kuantitas', 'Total Biaya'],
    ...[...d.items].sort((a, b) => (a.name < b.name ? -1 : 1)).map(i => { const ms = movesOf(d, i.no).filter(m => m.date <= asOf), q = qty(sum(ms, m => m.quantity)), v = formatIdr(sum(ms, m => m.value)); return [i.name, q, v, q, v] })]
}

/** Umur Persediaan per Gudang: as Umur Persediaan with the warehouse name column. */
export function inventoryAgingByWarehouse(d: InventoryData, asOf: string): string[][] {
  const [head, ...rows] = inventoryAging(d, asOf)
  return [[head![0]!, 'Nama Gudang', ...head!.slice(1)], ...rows.map(r => [r[0]!, WAREHOUSE, ...r.slice(1)])]
}
