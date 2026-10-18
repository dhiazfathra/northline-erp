import { fmtDate } from './general-ledger'
import { formatIdr } from './trial-balance'
import { layers } from '../inventory/fifo'

// Persediaan reports over stock_moves; rules in docs/reports/<planId>.md (fixture: fixtures/inventory-t4.json).

export interface StockMove { item: string; date: string; docType: string; docNumber: string; party: string; quantity: number; value: number; warehouse?: string; description?: string }
export interface StockItem { no: string; name: string; unit: string }
export interface InventoryData { items: StockItem[]; moves: StockMove[] }

const WAREHOUSE = 'Utama' // default warehouse
const wh = (m: StockMove) => m.warehouse ?? WAREHOUSE
/** "Saldo Awal"/"Saldo Barang per" labels use English month abbreviations (fixtures/transfer-t15.json: "31 Oct 2034"). */
const EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const enDate = (iso: string) => `${iso.slice(8, 10)} ${EN[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
const DOC_LABEL: Record<string, string> = { PI: 'Faktur Pembelian', SI: 'Faktur Penjualan', SRT: 'Retur Penjualan', PRT: 'Retur Pembelian', IA: 'Penyesuaian Persediaan', RI: 'Penerimaan Barang', IT: 'Pemindahan Barang' }
/** Generated movement description ("Pembelian dari <vendor>", "Retur ke <vendor>", …). */
const DESC: Record<string, string> = { PI: 'Pembelian dari', SI: 'Penjualan ke', SRT: 'Retur dari', PRT: 'Retur ke', RI: 'Penerimaan dari' }
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
      [prev, 'Saldo Awal', `Saldo Awal ${enDate(dayBefore(from))}`, qty(bal), '0', qty(bal)])
    for (const m of within) {
      bal += m.quantity
      const desc = m.docType === 'IA' ? `Penyesuaian ${m.docNumber}` : m.docType === 'IT' ? m.description! : `${DESC[m.docType]} ${m.party}`
      out.push([fmtDate(m.date), DOC_LABEL[m.docType]!, m.docNumber, desc, qty(Math.max(m.quantity, 0)), qty(Math.max(-m.quantity, 0)), qty(bal), wh(m)])
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

// ---- warehouse views (fixtures/inventory-t4.json single warehouse, transfer-t15.json two warehouses + transit) ----
const moveDesc = (m: StockMove) => (m.docType === 'IA' ? `Penyesuaian ${m.docNumber}` : m.docType === 'IT' ? m.description! : `${DESC[m.docType]} ${m.party}`)
const byName = (a: string, b: string) => (a < b ? -1 : 1)
const items = (d: InventoryData) => [...d.items].sort((a, b) => byName(a.name, b.name))

function mutationBlock(ms: StockMove[], from: string, to: string): string[][] {
  const within = ms.filter(m => m.date >= from && m.date <= to), open = sum(ms.filter(m => m.date < from), m => m.quantity)
  let bal = open
  const rows: string[][] = [[`Saldo Barang per ${enDate(dayBefore(from))}`, qty(open), '0', qty(open)]]
  for (const m of within) { bal += m.quantity; rows.push([m.docNumber, fmtDate(m.date), moveDesc(m), qty(Math.max(m.quantity, 0)), qty(Math.max(-m.quantity, 0)), qty(bal)]) }
  rows.push([qty(open + sum(within.filter(m => m.quantity > 0), m => m.quantity)), qty(-sum(within.filter(m => m.quantity < 0), m => m.quantity))])
  return rows
}
const warehousesOf = (ms: StockMove[]) => [...new Set(ms.map(wh))].sort(byName)

/** Mutasi per Barang: per selected item, a block per warehouse it ever touched (transit included), by warehouse name. */
export function itemMutationByWarehouse(d: InventoryData, itemNos: string[], from: string, to: string): string[][] {
  return itemNos.flatMap(no => { const it = d.items.find(i => i.no === no)!, ms = movesOf(d, no).filter(m => m.date <= to)
    return [[`Barang : ${it.name}`], ['Kode Barang Barang & Jasa', ':', it.no], ['Nama Barang', ':', it.name], ['Nomor #', 'Tanggal', 'Deskripsi', 'Masuk', 'Keluar', 'Saldo'],
      ...warehousesOf(ms).flatMap(w => [[w], ...mutationBlock(ms.filter(m => wh(m) === w), from, to)])] })
}

/** Mutasi per Gudang (selected warehouses): items with movements, then the warehouse in/out totals. */
export function warehouseMutationByItem(d: InventoryData, from: string, to: string, warehouses = [WAREHOUSE]): string[][] {
  const out: string[][] = [[`Gudang : ${warehouses.join(', ')}`], ['Gudang'], ['Deskripsi'], [':'], [':']]
  for (const w of [...warehouses].sort(byName)) {
    const ms = d.moves.filter(m => wh(m) === w && m.date <= to), within = ms.filter(m => m.date >= from)
    out.push([w], ['Nomor #', 'Tanggal', 'Deskripsi', 'Masuk', 'Keluar', 'Saldo'],
      ...items(d).filter(i => within.some(m => m.item === i.no)).flatMap(i => [[i.name], ...mutationBlock(ms.filter(m => m.item === i.no), from, to)]),
      [qty(sum(within.filter(m => m.quantity > 0), m => m.quantity)), qty(-sum(within.filter(m => m.quantity < 0), m => m.quantity))])
  }
  return out
}

/** Ringkasan Mutasi Gudang: per selected warehouse (by name), items with movements: opening, in, out, closing; warehouse totals. */
export function warehouseMutationSummary(d: InventoryData, from: string, to: string, warehouses = [WAREHOUSE]): string[][] {
  const out: string[][] = [[`Gudang : ${warehouses.join(', ')}`], ['Nama Barang Barang & Jasa', 'Saldo Awal', 'Masuk', 'Keluar', 'Saldo Akhir']]
  for (const w of [...warehouses].sort(byName)) {
    const rows = items(d).map(i => {
      const ms = movesOf(d, i.no).filter(m => wh(m) === w), within = ms.filter(m => m.date >= from && m.date <= to)
      const o = sum(ms.filter(m => m.date < from), m => m.quantity), inn = sum(within.filter(m => m.quantity > 0), m => m.quantity), x = -sum(within.filter(m => m.quantity < 0), m => m.quantity)
      return { name: i.name, active: within.length > 0, r: [o, inn, x, o + inn - x] }
    }).filter(r => r.active)
    if (!rows.length) continue
    out.push([w], ...rows.map(r => [r.name, ...r.r.map(qty)]), rows.reduce((a, r) => a.map((v, k) => v + r.r[k]!), [0, 0, 0, 0]).map(qty))
  }
  return out
}

/** Kuantitas Barang per Gudang: per warehouse quantity and value; an item's value is split across warehouses by quantity. */
export function quantityByWarehouse(d: InventoryData, asOf: string, warehouses = [WAREHOUSE]): string[][] {
  const ws = [...warehouses].sort(byName)
  return [['Nama Barang', ...ws, 'Total Nama Gudang'], ws.concat('').flatMap(() => ['Kuantitas', 'Total Biaya']),
    ...items(d).map(i => {
      const ms = movesOf(d, i.no).filter(m => m.date <= asOf), tq = sum(ms.filter(m => ws.includes(wh(m))), m => m.quantity), tv = sum(ms, m => m.value)
      const cells = ws.flatMap(w => { const q = sum(ms.filter(m => wh(m) === w), m => m.quantity); return [qty(q), formatIdr(tq ? Math.round(tv * q / tq) : 0)] })
      return [i.name, ...cells, qty(tq), formatIdr(tv)]
    })]
}

/** Umur Persediaan per Gudang: as Umur Persediaan with the warehouse name column. */
export function inventoryAgingByWarehouse(d: InventoryData, asOf: string): string[][] {
  const [head, ...rows] = inventoryAging(d, asOf)
  return [[head![0]!, 'Nama Gudang', ...head!.slice(1)], ...rows.map(r => [r[0]!, WAREHOUSE, ...r.slice(1)])]
}

/** Ringkasan Pemindahan Barang */
export function transferList(ts: { number: string; date: string; direction: 'OUT' | 'IN'; warehouse: string; reference: string }[], from: string, to: string): string[][] {
  return [['Tanggal', 'No. Pemindahan #', 'Proses', 'Gudang', 'Gudang Tujuan/Dari'],
    ...ts.filter(t => t.date >= from && t.date <= to).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
      .map(t => [fmtDate(t.date), t.number, t.direction === 'OUT' ? 'Kirim Barang' : 'Terima Barang', t.warehouse, t.reference])]
}

/** Penyesuaian Stok Barang: one block per adjustment (title lines repeat). */
export function adjustmentDetail(adjs: { number: string; date: string; description: string; lines: { item: string; name: string; unit: string; qty: number }[] }[], from: string, to: string): string[][] {
  return adjs.filter(a => a.date >= from && a.date <= to).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1)).flatMap(a => [
    ['Nomor #', ':', a.number, 'Keterangan', ':', a.description], ['Tanggal', ':', fmtDate(a.date)], ['Kode Barang', 'Nama Barang', 'Kuantitas', 'Satuan'],
    ...a.lines.map(l => [l.item, l.name, qty(l.qty), l.unit])])
}
