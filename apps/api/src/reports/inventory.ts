import { fmtDate, fmtHeaderDate } from './general-ledger'
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

const ITEM_TYPE: Record<string, string> = { SERVICE: 'Jasa', INVENTORY: 'Persediaan', NON_INVENTORY: 'Non Persediaan' }
/**
 * Daftar Barang dan Jasa (docs/reports/ItemListReport.md): items grouped by category in creation order, quantity on hand in
 * all warehouses as of the date. The ERP has no item categories or default selling prices yet: every item is in Accurate's
 * default category "Umum" with price 0, as the NL fixture items are.
 */
export function itemList(items: { no: string; name: string; type: string }[], moves: { item: string; date: string; quantity: number }[], asOf: string): string[][] {
  const qty = (no: string) => moves.filter(m => m.item === no && m.date <= asOf).reduce((s, m) => s + m.quantity, 0)
  return [['Daftar Barang dan Jasa'], [`Per Tgl. ${fmtHeaderDate(asOf)}`], ['Cabang : [Semua Cabang]'],
    ['Kode Barang', 'Nama Barang', 'Jenis Barang', 'Def. Hrg. Jual Satuan #1', 'Kts (Semua Gdng)'],
    ...(items.length ? [['Umum']] : []), ...items.map(i => [i.no, i.name, ITEM_TYPE[i.type]!, '0', formatIdr(Math.round(qty(i.no) * 100))])]
}

/** Kuantitas column a stock move counts in: returns count with their side (sales / purchases), receipts as purchases. */
const MOVE_COLUMN: Record<string, number> = { SI: 0, DO: 0, SRT: 0, PI: 1, RI: 1, PRT: 1, IT: 3, IA: 4 }
/**
 * Pergerakan Stok per Barang (docs/reports/StockMovementByWarehouseReport.md): one warehouse; per item with a move in the
 * window: opening, Penjualan, Pembelian, Produksi, Pemindahan, Penyesuaian, Lainnya, closing (signed quantities).
 */
export function stockMovementByWarehouse(d: InventoryData, warehouse: string, from: string, to: string): string[][] {
  const q = (n: number) => formatIdr(Math.round(n * 100))
  const rows: string[][] = [['Pergerakan Stok per Barang'], [`Dari ${fmtHeaderDate(from)} s/d ${fmtHeaderDate(to)}`],
    ['Nama Barang', 'Kuantitas Saldo Awal', 'Kuantitas Penjualan', 'Kuantitas Pembelian', 'Kuantitas Produksi', 'Kuantitas Pemindahan', 'Kuantitas Penyesuaian', 'Kuantitas Lainnya', 'Kuantitas Saldo Akhir']]
  for (const it of [...d.items].sort((a, b) => a.name.localeCompare(b.name))) {
    const ms = d.moves.filter(m => m.item === it.no && wh(m) === warehouse)
    const inRange = ms.filter(m => m.date >= from && m.date <= to)
    if (!inRange.length) continue
    const open = ms.filter(m => m.date < from).reduce((s, m) => s + m.quantity, 0)
    const cols = [0, 0, 0, 0, 0, 0]
    for (const m of inRange) cols[MOVE_COLUMN[m.docType] ?? 5]! += m.quantity
    rows.push([it.name, q(open), ...cols.map(q), q(open + cols.reduce((s, c) => s + c, 0))])
  }
  return rows
}

/**
 * Lembar Penghitungan Stok (docs/reports/PhysicalInventoryCountSheetReport.md): like Daftar Barang dan Jasa (category
 * blocks, creation order, all items) with the quantity in one warehouse as of the date and the unit; the two "Hitung"
 * columns are blank for writing in, so their cells drop out of each row.
 */
export function countSheet(items: { no: string; name: string; unit: string }[], moves: { item: string; date: string; quantity: number; warehouse?: string }[], warehouse: string, asOf: string): string[][] {
  const qty = (no: string) => moves.filter(m => m.item === no && m.date <= asOf && (m.warehouse ?? WAREHOUSE) === warehouse).reduce((s, m) => s + m.quantity, 0)
  return [['Lembar Penghitungan Stok'], [`Per Tgl. ${fmtHeaderDate(asOf)}`], ['Cabang : [Semua Cabang]'], ['Kode Barang', 'Nama Barang', 'Kuantitas', 'Satuan', 'Hitung #1', 'Hitung #2'],
    ...(items.length ? [['Umum']] : []), ...items.map(i => [i.no, i.name, formatIdr(Math.round(qty(i.no) * 100)), i.unit])]
}

/**
 * Analisa Nilai Persediaan (docs/reports/AnalysisInventoryValuationReport.md): every stock item (name order), all
 * warehouses: opening, Penjualan, Pembelian, Produksi, Penyesuaian, Lainnya, closing, each as quantity and FIFO value.
 * Columns as in Pergerakan Stok (returns with their side); transfers fall under Lainnya and net to zero over all warehouses.
 */
export function analysisValuation(d: InventoryData, from: string, to: string): string[][] {
  const q = (n: number) => formatIdr(Math.round(n * 100))
  const COL: Record<string, number> = { SI: 0, DO: 0, SRT: 0, PI: 1, RI: 1, PRT: 1, IA: 3 }
  const rows: string[][] = [['Analisa Nilai Persediaan'], [`Dari ${fmtHeaderDate(from)} s/d ${fmtHeaderDate(to)}`], ['Cabang : [Semua Cabang]'],
    ['Nama Barang', 'Saldo Awal', 'Penjualan', 'Pembelian', 'Produksi', 'Penyesuaian', 'Lainnya', 'Saldo Akhir'],
    ['Kuantitas', 'Nilai', 'Kuantitas', 'Nilai', 'Kuantitas', 'Nilai', 'Kuantitas', 'Nilai', 'Kuantitas', 'Nilai', 'Kuantitas', 'Nilai', 'Kuantitas', 'Nilai']]
  for (const it of [...d.items].sort((a, b) => a.name.localeCompare(b.name))) {
    const ms = d.moves.filter(m => m.item === it.no && m.date <= to)
    const before = ms.filter(m => m.date < from), cols = Array.from({ length: 5 }, () => ({ qty: 0, value: 0 }))
    for (const m of ms.filter(m => m.date >= from)) { const c = cols[COL[m.docType] ?? 4]!; c.qty += m.quantity; c.value += m.value }
    const open = { qty: before.reduce((s, m) => s + m.quantity, 0), value: before.reduce((s, m) => s + m.value, 0) }
    const close = { qty: open.qty + cols.reduce((s, c) => s + c.qty, 0), value: open.value + cols.reduce((s, c) => s + c.value, 0) }
    rows.push([it.name, ...[open, ...cols, close].flatMap(c => [q(c.qty), formatIdr(c.value)])])
  }
  return rows
}

/**
 * Ketersediaan Stok Penjualan (docs/reports/InventoryAnalysisReport.md): stock items in category blocks (creation order,
 * as Daftar Barang). Stok Gudang = all warehouses as of the date; Dipesan = quantity on open purchase orders dated by
 * then; Stok dapat dijual = Stok Gudang (Accurate does not add or subtract the orders).
 * Jual/Minggu: sales invoices less sales returns dated in the last 3 calendar months (asOf minus 3 months, inclusive),
 * divided by weeks = floor(days from the first invoice in that window to asOf / 7) + 1; 0 without an invoice in the
 * window. Delivery orders do not count; a delivered invoice counts on its own date. Two decimals, zeros dropped.
 */
// shortcut: Dijual (sold, not delivered) is 0 in every capture; purchase orders are never processed in the fixtures, so open = ordered.
export interface ItemSale { item: string; date: string; qty: number }
export function inventoryAnalysis(items: { no: string; name: string; type: string; unit: string }[], moves: { item: string; date: string; quantity: number }[], sales: ItemSale[], onOrder: { item: string; date: string; qty: number }[], asOf: string): string[][] {
  const rows: string[][] = [['Ketersediaan Stok Penjualan'], [`Per Tgl. ${fmtHeaderDate(asOf)}`], ['Cabang : [Semua Cabang]'],
    ['Nama Barang', 'Satuan', 'Stok Gudang', 'Dipesan', 'Dijual', 'Stok dapat dijual', 'Jual/Minggu']]
  const [y, m, d] = asOf.split('-').map(Number) as [number, number, number]
  const start = new Date(Date.UTC(y, m - 1 - 3, d)).toISOString().slice(0, 10)
  const f = (n: number) => formatIdr(Math.round(n * 100))
  const stock = items.filter(i => i.type === 'INVENTORY')
  if (stock.length) rows.push(['Umum'])
  for (const i of stock) {
    const qty = moves.filter(x => x.item === i.no && x.date <= asOf).reduce((s, x) => s + x.quantity, 0)
    const ordered = onOrder.filter(x => x.item === i.no && x.date <= asOf).reduce((s, x) => s + x.qty, 0)
    const win = sales.filter(x => x.item === i.no && x.date >= start && x.date <= asOf)
    const first = win.filter(x => x.qty > 0).map(x => x.date).sort()[0]
    const weeks = first ? Math.floor((Date.parse(asOf) - Date.parse(first)) / 86_400_000 / 7) + 1 : 0
    const perWeek = weeks ? String(Math.round(win.reduce((s, x) => s + x.qty, 0) / weeks * 100) / 100).replace('.', ',') : '0'
    rows.push([i.name, i.unit, f(qty), f(ordered), '0', f(qty), perWeek])
  }
  return rows
}

/**
 * Rincian Umur Persediaan (docs/reports/InventoryAgingDetailReport.md): one item in one warehouse. Every incoming move
 * (purchase, receipt, sales return, adjustment in) opens a FIFO layer; outgoing moves consume the oldest layers. Remaining
 * layers are aged at the as-of date: 1 - 30, 31 - 60, 61 - 90, 91 - 120, > 120 days; last row = bucket totals.
 */
export function inventoryAgingDetail(d: InventoryData, item: string, warehouse: string, asOf: string): string[][] {
  const it = d.items.find(i => i.no === item)!
  const layers: { m: StockMove; left: number }[] = []
  const ms = d.moves.filter(m => m.item === item && wh(m) === warehouse && m.date <= asOf).sort((a, b) => a.date.localeCompare(b.date))
  for (const m of ms) {
    if (m.quantity > 0) { layers.push({ m, left: m.quantity }); continue }
    let out = -m.quantity
    for (const l of layers) { const take = Math.min(l.left, out); l.left -= take; out -= take; if (!out) break }
  }
  const q = (n: number) => formatIdr(Math.round(n * 100))
  const bucket = (date: string) => { const days = (Date.parse(asOf) - Date.parse(date)) / 86_400_000; return days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : days <= 120 ? 3 : 4 }
  const open = layers.filter(l => l.left > 0), totals = [0, 0, 0, 0, 0]
  const rows: string[][] = [['Rincian Umur Persediaan'], [`Per Tgl. ${fmtHeaderDate(asOf)}`],
    ['Kode Barang', ':', it.no, 'Satuan', ':', it.unit], ['Nama Barang', ':', it.name, 'Stok', ':', q(open.reduce((s, l) => s + l.left, 0))],
    ['No Referensi', 'Tanggal', 'Tipe Transaksi', '1 - 30', '31 - 60', '61 - 90', '91 - 120', '> 120']]
  for (const l of open) {
    const b = [0, 0, 0, 0, 0]; b[bucket(l.m.date)] = l.left; b.forEach((v, i) => (totals[i]! += v))
    rows.push([l.m.docNumber, fmtDate(l.m.date), DOC_LABEL[l.m.docType] ?? l.m.docType, ...b.map(q)])
  }
  rows.push(totals.map(q))
  return rows
}

/**
 * Rincian Ketersediaan Stok Penjualan (docs/reports/InventoryAnalysisDetailReport.md): one item; Dipesan = its open
 * purchase-order lines dated by the as-of date (Tgl Estimasi = order date, Nama Referensi = vendor). With no open
 * line Accurate prints the labels with empty values.
 */
export function inventoryAnalysisDetail(d: InventoryData, orders: { number: string; date: string; vendorName: string; qty: number; item: string }[], item: string, asOf: string): string[][] {
  const lines = orders.filter(o => o.item === item && o.date <= asOf).sort((a, b) => a.date.localeCompare(b.date))
  const q = (n: number) => formatIdr(Math.round(n * 100))
  const stock = d.moves.filter(m => m.item === item && m.date <= asOf).reduce((s, m) => s + m.quantity, 0)
  const ordered = lines.reduce((s, l) => s + l.qty, 0), v = (x: string) => (lines.length ? [':', x] : [':'])
  return [['Rincian Ketersediaan Stok Penjualan'], [`Per Tgl. ${fmtHeaderDate(asOf)}`],
    ['Dipesan'], v(q(ordered)), ['Dijual'], v('0'), ['Stok dapat dijual'], v(q(stock)), ['Stok Gudang'], v(q(stock)),
    ['No Referensi', 'Tgl Estimasi', 'Nama Referensi', 'Dipesan', 'Dijual'],
    ...lines.map(l => [l.number, fmtDate(l.date), l.vendorName, q(l.qty), '0']), ...(lines.length ? [[q(ordered), '0']] : [])]
}

/** Barang Grup (docs/reports/ItemGroupDetailReport.md): one block per group item (creation order), components in entry order. */
export function itemGroupDetail(groups: { no: string; name: string; unit: string; components: { no: string; name: string; qty: number; unit: string }[] }[]): string[][] {
  if (!groups.length) return [['Kode Barang Grup Barang', ':', 'Satuan', ':'], ['Nama Barang Grup Barang', ':'], ['Kode Barang Barang & Jasa', 'Nama Barang', 'Kuantitas', 'Satuan']]
  return groups.flatMap(g => [['Kode Barang Grup Barang', ':', g.no, 'Satuan', ':', g.unit], ['Nama Barang Grup Barang', ':', g.name],
    ['Kode Barang Barang & Jasa', 'Nama Barang', 'Kuantitas', 'Satuan'], ...g.components.map(c => [c.no, c.name, String(c.qty), c.unit])])
}

/**
 * Rincian Nilai Persediaan (CSV) (docs/reports/InventoryValuationDetailDownloadReport.md): one file per item. An opening
 * row (no number, dated the day before the start) carries quantity and value in; then each move in the window with the
 * running quantity and value. Values are plain rupiah.
 */
export function inventoryValuationCsv(moves: StockMove[], item: string, from: string, to: string): string[][] {
  const ms = moves.filter(m => m.item === item && m.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.docNumber.localeCompare(b.docNumber))
  const before = ms.filter(m => m.date < from), num = (c: number) => String(c / 100).replace('.', ',')
  let q = before.reduce((s, m) => s + m.quantity, 0), v = before.reduce((s, m) => s + m.value, 0)
  const prev = new Date(Date.parse(from + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10)
  const rows = [['Nomor #', 'Tanggal', 'Kts Masuk', 'Nilai Masuk', 'Kts Keluar', 'Nilai Keluar', 'Kts Akhir', 'Nilai Akhir'], ['', prev, String(q), num(v), '0', '0', String(q), num(v)]]
  for (const m of ms.filter(m => m.date >= from)) {
    q += m.quantity; v += m.value
    rows.push([m.docNumber, m.date, String(Math.max(m.quantity, 0)), num(Math.max(m.value, 0)), String(Math.max(-m.quantity, 0)), num(Math.max(-m.value, 0)), String(q), num(v)])
  }
  return rows
}

/**
 * Selisih Saldo Akun Persediaan dengan Nilai Barang (docs/reports/ItemValueToAccountBalanceDifferenceReport.md): balances
 * of the inventory accounts at the end date against the stock value of all items at that date; the difference should be 0.
 */
export function itemValueDifference(accounts: { no: string; name: string; balance: number }[], itemValue: number): string[][] {
  const total = accounts.reduce((s, a) => s + a.balance, 0), f = formatIdr
  return [['Nomor #', 'Tanggal', 'Tipe Transaksi', 'Keterangan', 'Nilai'], ['Selisih antara akun persediaan dengan nilai barang'], ['Saldo Akun Persediaan'],
    ...accounts.map(a => [a.no, '-', a.name, f(a.balance)]), ['Total dari Saldo Akun Persediaan', f(total)],
    ['Nilai barang'], ['Nilai barang', '-', 'Nilai barang Persediaan', f(-itemValue)], ['Total dari Nilai barang', f(-itemValue)],
    ['Total dari Selisih antara akun persediaan dengan nilai barang', f(total - itemValue)]]
}
