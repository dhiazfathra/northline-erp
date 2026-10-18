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
