import { fmtDate, fmtHeaderDate } from './general-ledger'
import { BUCKETS, openInvoices, spread, type AgingBasis, type SalesData } from './receivables'
import { formatIdr } from './trial-balance'

// Utang reports whose layout differs from the Piutang version (the rest reuse receivables.ts with AP labels).
// Rules in docs/reports/<planId>.md; fixture fixtures/purchase-t3.json.

const CURRENCY = 'Indonesian Rupiah'
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
const vendorsByName = (d: SalesData) => [...d.customers.keys()].sort((a, b) => (d.customers.get(a)! < d.customers.get(b)! ? -1 : 1))

/** Faktur Belum Lunas (Utang): column header before the currency line; vendor name rows carry no "Sisa Kredit". */
export function outstandingPurchases(d: SalesData, asOf: string, basis: AgingBasis = 'DUE_DATE'): string[][] {
  const out: string[][] = [['Nomor #', 'Tanggal', 'Jatuh Tempo', 'Total', 'Utang', 'Utang Pajak', 'Umur (hr)'], [CURRENCY]]
  let gt = 0, go = 0
  for (const v of vendorsByName(d)) {
    const xs = openInvoices(d, asOf, v, basis)
    if (!xs.length) continue
    const t = xs.reduce((s, x) => s + x.total, 0), o = xs.reduce((s, x) => s + x.owing, 0)
    out.push([d.customers.get(v)!], ...xs.map(x => [x.number, fmtDate(x.date), fmtDate(x.dueDate), formatIdr(x.total), formatIdr(x.owing), '0', formatIdr(x.age * 100)]),
      [formatIdr(t), formatIdr(o), '0'])
    gt += t; go += o
  }
  out.push([formatIdr(gt), formatIdr(go), '0'])
  return out
}

/** Umur Utang: no currency column and no credit column; one total row. */
export function agingPayable(d: SalesData, asOf: string, basis: AgingBasis = 'DUE_DATE'): string[][] {
  const rows = vendorsByName(d).map(v => ({ v, xs: openInvoices(d, asOf, v, basis) })).filter(r => r.xs.length)
  const line = (xs: { owing: number; age: number }[]) => [formatIdr(xs.reduce((s, x) => s + x.owing, 0)), ...spread(xs).map(formatIdr)]
  return [['Pemasok', 'Utang', ...BUCKETS], ...rows.map(r => [d.customers.get(r.v)!, ...line(r.xs)]), ['Total Pemasok', ...line(rows.flatMap(r => r.xs))]]
}

/** Pembelian per Pemasok */
export function purchaseByVendor(d: SalesData, from: string, to: string): string[][] {
  const rows = vendorsByName(d).map(v => [v, d.invoices.filter(i => i.customer === v && i.date >= from && i.date <= to).reduce((s, i) => s + i.total, 0)] as const).filter(([, t]) => t)
  const total = formatIdr(rows.reduce((s, [, t]) => s + t, 0))
  return [['Mata Uang', 'Pemasok', 'Pembelian (prime)'], ...rows.map(([v, t], i) => [...(i === 0 ? [CURRENCY] : []), d.customers.get(v)!, formatIdr(t)]),
    ['Total Pemasok', total], ['Total Mata Uang', total]]
}

const inRange = (x: { date: string }, from: string, to: string) => x.date >= from && x.date <= to
const byDateNo = (a: { date: string; number: string }, b: { date: string; number: string }) => (a.date + a.number < b.date + b.number ? -1 : 1)
const qty = (q: number) => formatIdr(Math.round(q * 100))

/** Faktur Belum Lunas per Pemasok */
export function outstandingPerVendor(d: SalesData, asOf: string): string[][] {
  const rows = vendorsByName(d).map(v => ({ v, xs: openInvoices(d, asOf, v) })).filter(r => r.xs.length)
  const t = (xs: { total: number; owing: number }[]) => [formatIdr(xs.reduce((s, x) => s + x.total, 0)), formatIdr(xs.reduce((s, x) => s + x.owing, 0)), '0']
  const all = rows.flatMap(r => r.xs)
  return [['Mata Uang', 'Pemasok', 'Total', 'Utang', 'Utang Pajak'], ...rows.map((r, i) => [...(i === 0 ? [CURRENCY] : []), d.customers.get(r.v)!, ...t(r.xs)]), ['Total Pemasok', ...t(all)], ['Total Mata Uang', ...t(all)]]
}

/** Rincian Umur Utang: the per-vendor subtotal prints the owing and the first five buckets (no "> 120" cell). */
export function agingPayableDetail(d: SalesData, asOf: string, basis: AgingBasis = 'DUE_DATE'): string[][] {
  const out: string[][] = [['Nomor #', 'Tanggal', 'Utang', ...BUCKETS], [CURRENCY]]
  for (const v of vendorsByName(d)) {
    const xs = openInvoices(d, asOf, v, basis)
    if (!xs.length) continue
    out.push([d.customers.get(v)!], ...xs.map(x => [x.number, fmtDate(x.date), formatIdr(x.owing), ...spread([x]).map(formatIdr)]),
      [formatIdr(xs.reduce((s, x) => s + x.owing, 0)), ...spread(xs).slice(0, 5).map(formatIdr)])
  }
  return out
}

const linesIn = (d: SalesData, from: string, to: string) => d.invoices.filter(i => inRange(i, from, to)).sort(byDateNo).flatMap(i => (i.lines ?? []).map(l => ({ ...l, inv: i })))

/** Pembelian per Barang */
export function purchaseByItem(d: SalesData, from: string, to: string): string[][] {
  const ls = linesIn(d, from, to), items = [...new Set(ls.map(l => l.item))].sort((a, b) => (ls.find(l => l.item === a)!.itemName < ls.find(l => l.item === b)!.itemName ? -1 : 1))
  const sum = (xs: typeof ls) => [qty(xs.reduce((s, x) => s + x.qty, 0)), formatIdr(xs.reduce((s, x) => s + x.total, 0))]
  return [['Nama Barang', 'Kts (Unit#1)', 'Pembelian'], ...items.map(i => { const xs = ls.filter(l => l.item === i); return [xs[0]!.itemName, ...sum(xs)] }), ['Total Nama Barang', ...sum(ls)]]
}

/** Rincian Pembelian per Barang: no subtotal rows. */
export function purchaseByItemDetail(d: SalesData, from: string, to: string): string[][] {
  const ls = linesIn(d, from, to), out: string[][] = [['Nomor #', 'Tanggal', 'Keterangan', 'Kuantitas', 'Satuan', 'Pembelian']]
  for (const item of [...new Set(ls.map(l => l.item))]) {
    const xs = ls.filter(l => l.item === item)
    out.push([xs[0]!.itemName], ...xs.map(l => [l.inv.number, fmtDate(l.inv.date), l.inv.description, qty(l.qty), l.unit, formatIdr(l.total)]))
  }
  return out
}

/** Rincian Pembelian per Pemasok */
export function purchaseByVendorDetail(d: SalesData, from: string, to: string): string[][] {
  const out: string[][] = [['Nomor #', 'Tanggal', 'Keterangan', 'Pembelian (prime)'], [CURRENCY]]
  let grand = 0
  for (const v of vendorsByName(d)) {
    const xs = d.invoices.filter(i => i.customer === v && inRange(i, from, to)).sort(byDateNo)
    if (!xs.length) continue
    const t = xs.reduce((s, x) => s + x.total, 0); grand += t
    out.push([d.customers.get(v)!], ...xs.map(i => [i.number, fmtDate(i.date), i.description, formatIdr(i.total)]), [formatIdr(t)])
  }
  out.push([formatIdr(grand)])
  return out
}

/** Rincian Pembayaran Pembelian: per payment; invoices are identified by the vendor's bill number; method "Tunai". */
export function purchasePaymentDetail(d: SalesData, from: string, to: string): string[][] {
  return d.receipts.filter(r => inRange(r, from, to)).sort(byDateNo).flatMap(r => [
    ['Pemasok', ':', d.customers.get(r.customer)!, 'Nama Bank', ':', r.bankName ?? ''], ['No Bukti #', ':', r.number, 'Metode Bayar', ':', 'Tunai'],
    ['Tgl Bayar', ':', fmtDate(r.date)], ['Nilai Pembayaran'], [':', formatIdr(r.amount)],
    ['No. Faktur', 'Tgl Faktur', 'Total Faktur', 'Bayar', 'Diskon', 'Pembayaran'],
    ...r.payments.map(p => { const i = d.invoices.find(x => x.number === p.invoice)!; return [i.bill ?? i.number, fmtDate(i.date), formatIdr(i.total), formatIdr(p.amount), '0', formatIdr(p.amount)] }),
    [formatIdr(r.amount), '0', formatIdr(r.amount)],
  ])
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
/** Utang per Bulan: opening before the year, net change per month (invoices − payments), closing; totals row. */
export function payablePerMonth(d: SalesData, year: number): string[][] {
  const moves = (v: string) => [...d.invoices.filter(i => i.customer === v).map(i => ({ date: i.date, a: i.total })), ...d.receipts.filter(r => r.customer === v).map(r => ({ date: r.date, a: -r.amount }))]
  const rows = vendorsByName(d).map(v => {
    const ms = moves(v), open = ms.filter(m => m.date < `${year}-01-01`).reduce((s, m) => s + m.a, 0)
    const months = BULAN.map((_, i) => ms.filter(m => m.date.startsWith(`${year}-${String(i + 1).padStart(2, '0')}`)).reduce((s, m) => s + m.a, 0))
    return [v, open, ...months, open + months.reduce((s, x) => s + x, 0)] as [string, ...number[]]
  }).filter(([v]) => moves(v).some(m => m.date.startsWith(`${year}-`))) // only vendors with movements in the year
  const tot = rows[0] ? rows[0].slice(1).map((_, k) => rows.reduce((s, r) => s + (r[k + 1] as number), 0)) : []
  return [['Nama Pemasok', 'Saldo Awal', ...BULAN, 'Saldo Akhir'], [CURRENCY], ...rows.map(([v, ...n]) => [d.customers.get(v)!, ...n.map(formatIdr)]), tot.map(formatIdr)]
}

/** Rincian Faktur Pembelian */
export function purchaseInvoiceDetail(d: SalesData, from: string, to: string): string[][] {
  return d.invoices.filter(i => inRange(i, from, to)).sort(byDateNo).flatMap(i => [
    ['Nomor #', ':', i.number, 'Mata Uang', ':', CURRENCY], ['Tanggal', ':', fmtDate(i.date), 'Sub Total', ':', formatIdr(i.total)],
    ['Pemasok', ':', d.customers.get(i.customer)!, 'Total Biaya', ':', '0'], ['Nama Biaya', ':', 'Total', ':', formatIdr(i.total)],
    ['Kode #', 'Nama Barang', 'Kuantitas', '@Harga', 'Total Harga'],
    ...(i.lines ?? []).map(l => [l.item, l.itemName, qty(l.qty), formatIdr(l.price), formatIdr(l.total)]),
    [qty((i.lines ?? []).reduce((s, l) => s + l.qty, 0)), formatIdr(i.total)],
  ])
}

// ---- purchase orders and goods receipts ----
export interface OrderDoc { number: string; vendor: string; date: string; total: number; lines: { item: string; itemName: string; unit: string; qty: number; price: number; total: number }[] }
export interface OrderData { vendors: Map<string, string>; orders: OrderDoc[]; receipts: OrderDoc[] }
const byDateNo2 = (a: OrderDoc, b: OrderDoc) => (a.date + a.number < b.date + b.number ? -1 : 1)
const inR = (x: { date: string }, f: string, t: string) => x.date >= f && x.date <= t

export const orderList = (d: OrderData, f: string, t: string) =>
  [['Nomor #', 'Tanggal', 'Pemasok', 'Total'], ...d.orders.filter(o => inR(o, f, t)).sort(byDateNo2).map(o => [o.number, fmtDate(o.date), d.vendors.get(o.vendor)!, formatIdr(o.total)])]

export const orderDetail = (d: OrderData, f: string, t: string) => d.orders.filter(o => inR(o, f, t)).sort(byDateNo2).flatMap(o => [
  ['Nomor #', ':', o.number, 'Mata Uang', ':', CURRENCY], ['Tanggal', ':', fmtDate(o.date), 'Sub Total', ':', formatIdr(o.total)],
  ['Pemasok', ':', d.vendors.get(o.vendor)!, 'Total Biaya', ':', '0'], ['Nama Biaya', ':', 'Total', ':', formatIdr(o.total)],
  ['Kode #', 'Nama Barang', 'Kuantitas', '@Harga', 'Total Harga'], ...o.lines.map(l => [l.item, l.itemName, qty(l.qty), formatIdr(l.price), formatIdr(l.total)]),
  [qty(o.lines.reduce((s, l) => s + l.qty, 0)), formatIdr(o.total)]])

/** Pesanan Pembelian per Barang. shortcut: "Kts Terproses" is 0 (orders are not linked to receipts yet; matches the unlinked sandbox case). */
export function orderByItem(d: OrderData, f: string, t: string) {
  const ls = d.orders.filter(o => inR(o, f, t)).flatMap(o => o.lines), items = [...new Set(ls.map(l => l.item))]
  const row = (xs: typeof ls) => [qty(xs.reduce((s, l) => s + l.qty, 0)), '0', formatIdr(xs.reduce((s, l) => s + l.total, 0))]
  return [['Nama Barang Barang & Jasa', 'Kts (Unit#1)', 'Kts Terproses', 'Total Harga'], ...items.map(i => { const xs = ls.filter(l => l.item === i); return [xs[0]!.itemName, ...row(xs)] }), ['Total Nama Barang Barang & Jasa', ...row(ls)]]
}

export function orderByVendor(d: OrderData, f: string, t: string) {
  const os = d.orders.filter(o => inR(o, f, t)), vs = [...new Set(os.map(o => o.vendor))].sort((a, b) => (d.vendors.get(a)! < d.vendors.get(b)! ? -1 : 1))
  return [['Pemasok', 'Total'], ...vs.map(v => [d.vendors.get(v)!, formatIdr(os.filter(o => o.vendor === v).reduce((s, o) => s + o.total, 0))]), ['Total Pemasok', formatIdr(os.reduce((s, o) => s + o.total, 0))]]
}

/** Daftar Penerimaan Barang; the "Pengiriman" (shipment) column prints nothing when unset. */
export const receiveList = (d: OrderData, f: string, t: string) =>
  [['Nomor #', 'Tanggal', 'Pemasok', 'Pengiriman'], ...d.receipts.filter(r => inR(r, f, t)).sort(byDateNo2).map(r => [r.number, fmtDate(r.date), d.vendors.get(r.vendor)!])]

export const receiveDetail = (d: OrderData, f: string, t: string) => d.receipts.filter(r => inR(r, f, t)).sort(byDateNo2).flatMap(r => [
  ['Nomor #', ':', r.number, 'Pemasok', ':', d.vendors.get(r.vendor)!], ['Tanggal', ':', fmtDate(r.date)], ['Kode #', 'Nama Barang', 'Kuantitas', 'Satuan'],
  ...r.lines.map(l => [l.item, l.itemName, qty(l.qty), l.unit]), [qty(r.lines.reduce((s, l) => s + l.qty, 0))]])

// ---- Permintaan Barang. shortcut: requisitions are never linked to orders yet, so status/processed figures are the unprocessed case ----
export interface Requisition { number: string; date: string; description: string; lines: { item: string; itemName: string; unit: string; qty: number }[] }
const reqIn = (rs: Requisition[], f: string, t: string) => rs.filter(r => inR(r, f, t)).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
export const requisitionList = (rs: Requisition[], f: string, t: string) =>
  [['Nomor #', 'Tanggal', 'Status', 'Keterangan'], ...reqIn(rs, f, t).map(r => [r.number, fmtDate(r.date), 'Menunggu diproses', r.description])]
export const requisitionDetail = (rs: Requisition[], f: string, t: string) => reqIn(rs, f, t).flatMap(r => [
  ['Nomor #', ':', r.number], ['Tanggal', ':', fmtDate(r.date)], ['Kode #', 'Nama Barang', 'Kuantitas'], ...r.lines.map(l => [l.item, l.itemName, qty(l.qty)]), [qty(r.lines.reduce((s, l) => s + l.qty, 0))]])
export function requisitionByItem(rs: Requisition[], f: string, t: string) {
  const ls = reqIn(rs, f, t).flatMap(r => r.lines), items = [...new Set(ls.map(l => l.item))]
  const q = (xs: typeof ls) => qty(xs.reduce((s, l) => s + l.qty, 0))
  return [['Nama Barang Barang & Jasa', 'Kts (Unit#1)'], ...items.map(i => { const xs = ls.filter(l => l.item === i); return [xs[0]!.itemName, q(xs)] }), ['Total Nama Barang Barang & Jasa', q(ls)]]
}
export const requisitionOrderStatus = (rs: Requisition[], f: string, t: string) => reqIn(rs, f, t).flatMap(r => [
  ['Nomor #', ':', r.number, 'Keterangan', ':', r.description], ['Tanggal', ':', fmtDate(r.date)],
  ['Kode #', 'Nama Barang', 'Kuantitas (Unit)', 'Kts Dipesan (Unit)', 'Persentase PO (Kts)', 'Tot Hrg Estimasi', 'Total Harga Pesanan', 'Persentase PO (Harga)'],
  ...r.lines.map(l => [l.item, l.itemName, `${qty(l.qty)} ${l.unit}`, `0 ${l.unit}`, '0 %', '0', '0', '0 %'])])

/**
 * Pembelian per Biaya (docs/reports/PurchaseByExpenseReport.md): Biaya-tab amounts of purchase invoices dated in the
 * window, summed per expense account, ordered by account number; item lines do not count.
 */
export function purchaseByExpense(expenses: { date: string; account: string; accountName: string; amount: number }[], from: string, to: string): string[][] {
  const by = new Map<string, { name: string; amount: number }>()
  for (const e of expenses.filter(e => e.date >= from && e.date <= to)) {
    const x = by.get(e.account) ?? { name: e.accountName, amount: 0 }; x.amount += e.amount; by.set(e.account, x)
  }
  const rows = [...by].sort(([a], [b]) => a.localeCompare(b)).map(([, x]) => [x.name, formatIdr(x.amount)])
  return rows.length ? [['Nama Akun', 'Jumlah'], ...rows, ['Total Nama Akun', formatIdr([...by.values()].reduce((s, x) => s + x.amount, 0))]] : []
}

/**
 * Perubahan Harga Beli Per Barang (docs/reports/VendorPriceHistoryReport.md): per item, its vendor price changes dated by
 * the as-of date, oldest first. Harga Lama = the same vendor's previous price for the item (0 for the first);
 * Tanggal Berakhir is empty (no end date set), so the cell is dropped.
 */
// shortcut: IDR only, end-effective dates not modelled.
/** Penyesuaian Harga Beli (fixtures/retail/inventory-re.json): one titled block per Harga Pemasok document dated in range, lines in
 *  entry order with the new price in en-US format; a blank Tanggal Berakhir drops its cell. */
// shortcut: IDR only (Mata Uang prints the currency name); add a currency per document when foreign vendors price items.
export function vendorPriceAdjustmentDetail(prices: { number: string; vendorName: string; date: string; endDate?: string; item: string; itemName: string; price: number }[], from: string, to: string): string[][] {
  const docs = [...new Set(prices.filter(p => p.date >= from && p.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number)).map(p => p.number))]
  return docs.flatMap(n => {
    const ls = prices.filter(p => p.number === n), d = ls[0]!
    return [['Penyesuaian Harga Beli'], [`Dari ${fmtHeaderDate(from)} s/d ${fmtHeaderDate(to)}`], ['Nomor #', ':', n, 'Mata Uang', ':', 'Indonesian Rupiah'],
      ['Mulai Berlaku', ':', fmtDate(d.date), 'Tanggal Berakhir', ':', ...(d.endDate ? [fmtDate(d.endDate)] : [])], ['Pemasok', ':', d.vendorName],
      ['Kode #', 'Nama Barang', 'Harga Baru'], ...ls.map(l => [l.item, l.itemName, (l.price / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })])]
  })
}

export function vendorPriceHistory(prices: { number: string; vendorName: string; date: string; item: string; itemName: string; unit: string; price: number }[], items: string[], asOf: string): string[][] {
  const rows: string[][] = [['Mulai Berlaku', 'Tanggal Berakhir', 'Pemasok', 'Mata Uang', 'Harga Lama', 'Harga Baru', 'Satuan']]
  for (const item of items) {
    const ps = prices.filter(p => p.item === item && p.date <= asOf).sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number))
    if (!ps.length) continue
    rows.push([ps[0]!.itemName])
    const last = new Map<string, number>()
    for (const p of ps) { rows.push([fmtDate(p.date), p.vendorName, 'IDR', formatIdr(last.get(p.vendorName) ?? 0), formatIdr(p.price), p.unit]); last.set(p.vendorName, p.price) }
  }
  return rows
}
