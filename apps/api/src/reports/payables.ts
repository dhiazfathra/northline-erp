import { fmtDate } from './general-ledger'
import { BUCKETS, openInvoices, spread, type SalesData } from './receivables'
import { formatIdr } from './trial-balance'

// Utang reports whose layout differs from the Piutang version (the rest reuse receivables.ts with AP labels).
// Rules in docs/reports/<planId>.md; fixture fixtures/purchase-t3.json.

const CURRENCY = 'Indonesian Rupiah'
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
const vendorsByName = (d: SalesData) => [...d.customers.keys()].sort((a, b) => (d.customers.get(a)! < d.customers.get(b)! ? -1 : 1))

/** Faktur Belum Lunas (Utang): column header before the currency line; vendor name rows carry no "Sisa Kredit". */
export function outstandingPurchases(d: SalesData, asOf: string): string[][] {
  const out: string[][] = [['Nomor #', 'Tanggal', 'Jatuh Tempo', 'Total', 'Utang', 'Utang Pajak', 'Umur (hr)'], [CURRENCY]]
  let gt = 0, go = 0
  for (const v of vendorsByName(d)) {
    const xs = openInvoices(d, asOf, v)
    if (!xs.length) continue
    const t = xs.reduce((s, x) => s + x.total, 0), o = xs.reduce((s, x) => s + x.owing, 0)
    out.push([d.customers.get(v)!], ...xs.map(x => [x.number, fmtDate(x.date), fmtDate(x.dueDate), formatIdr(x.total), formatIdr(x.owing), '0', formatIdr(days(x.dueDate, asOf) * 100)]),
      [formatIdr(t), formatIdr(o), '0'])
    gt += t; go += o
  }
  out.push([formatIdr(gt), formatIdr(go), '0'])
  return out
}

/** Umur Utang: no currency column and no credit column; one total row. */
export function agingPayable(d: SalesData, asOf: string): string[][] {
  const rows = vendorsByName(d).map(v => ({ v, xs: openInvoices(d, asOf, v) })).filter(r => r.xs.length)
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
export function agingPayableDetail(d: SalesData, asOf: string): string[][] {
  const out: string[][] = [['Nomor #', 'Tanggal', 'Utang', ...BUCKETS], [CURRENCY]]
  for (const v of vendorsByName(d)) {
    const xs = openInvoices(d, asOf, v)
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
