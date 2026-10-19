import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { fmtDate } from './general-ledger'
import { num } from './salesman'

// Penawaran / Pesanan Penjualan reports (Retail Demo, en-US numbers); rules in docs/reports/<planId>.md and ADR-0027
// (fixture: fixtures/retail/quotation-rd.json). Amounts are cents IDR. Untaxed documents only: Total = Sub Total.

export interface OrderDocLine { item: string; itemName: string; qty: number; price: number; total: number; processed: number }
export interface OrderDoc { number: string; customer: string; date: string; total: number; lines: OrderDocLine[] }
export interface OrderData { quotations: OrderDoc[]; orders: OrderDoc[] }

/** Processed quantity: quotation lines taken into orders; order lines billed by invoices. */
// shortcut: delivery orders (Pengiriman Pesanan) do not count as processed yet; add them when a delivered order is captured.
export async function loadOrderData(db: Db): Promise<OrderData> {
  const load = async (head: string, lines: string, key: string, done: string, doneNum: string, doneSeq: string) => {
    const ls = await db.execute(sql.raw(`SELECT l.${key} AS doc, l.seq, l.item_no, i.name, l.quantity, l.unit_price,
      COALESCE((SELECT SUM(d.quantity) FROM ${done} d WHERE d.${doneNum} = l.${key} AND d.${doneSeq} = l.seq), 0) AS processed
      FROM ${lines} l JOIN items i ON i.no = l.item_no ORDER BY l.${key}, l.seq`))
    return (await db.execute(sql.raw(`SELECT h.number, c.name, to_char(h.date,'YYYY-MM-DD') AS date, h.total FROM ${head} h JOIN customers c ON c.no = h.customer_no`))).map(r => ({
      number: r.number as string, customer: r.name as string, date: r.date as string, total: Number(r.total),
      lines: ls.filter(l => l.doc === r.number).map(l => ({ item: l.item_no as string, itemName: l.name as string, qty: Number(l.quantity), price: Number(l.unit_price),
        total: Math.round(Number(l.quantity) * Number(l.unit_price)), processed: Number(l.processed) })),
    }))
  }
  return {
    quotations: await load('sales_quotations', 'sales_quotation_lines', 'quotation_number', 'sales_order_lines', 'quotation_number', 'quotation_seq'),
    orders: await load('sales_orders', 'sales_order_lines', 'order_number', 'sales_invoice_lines', 'order_number', 'order_seq'),
  }
}

const amt = (cents: number) => num(cents / 100)
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const asc = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
export function status(d: OrderDoc) {
  if (d.lines.every(l => l.processed >= l.qty)) return 'Terproses'
  return d.lines.some(l => l.processed > 0) ? 'Sebagian diproses' : 'Menunggu diproses'
}
const pick = (docs: OrderDoc[], from: string, to: string) => docs.filter(d => d.date >= from && d.date <= to)
const open = (docs: OrderDoc[], from: string, to: string) => pick(docs, from, to).filter(d => status(d) !== 'Terproses')

/** Daftar Penawaran / Pesanan Penjualan. Orders carry a `No. PO` column (blank cells are not printed). */
export function docList(docs: OrderDoc[], from: string, to: string, kind: 'SQ' | 'SO') {
  const rows = pick(docs, from, to).sort((a, b) => asc(a.date, b.date) || asc(a.number, b.number))
  return [kind === 'SO' ? ['Nomor #', 'No. PO', 'Tanggal', 'Pelanggan', 'Total', 'Status'] : ['Nomor #', 'Tanggal', 'Pelanggan', 'Total', 'Status'],
    ...rows.map(d => [d.number, fmtDate(d.date), d.customer, amt(d.total), status(d)])]
}

/** Rincian Penawaran / Pesanan Penjualan: one block per document, lines, then total quantity | total price. */
export function docDetail(docs: OrderDoc[], from: string, to: string) {
  return pick(docs, from, to).sort((a, b) => asc(a.number, b.number)).flatMap(d => [
    ['Nomor #', ':', d.number, 'Sub Total', ':', amt(d.total)],
    ['Tanggal', ':', fmtDate(d.date), 'Total Biaya', ':', '0'],
    ['Pelanggan', ':', d.customer, 'Total', ':', amt(d.total)],
    ['Mata Uang', ':', 'Indonesian Rupiah', 'Nama Biaya', ':'],
    d.number.startsWith('SO') ? ['Kode #', 'No. PO', 'Nama Barang', 'Kuantitas', '@Harga', 'Total Harga'] : ['Kode #', 'Nama Barang', 'Kuantitas', '@Harga', 'Total Harga'],
    ...d.lines.map(l => [l.item, l.itemName, num(l.qty), amt(l.price), amt(l.total)]),
    [num(sum(d.lines.map(l => l.qty))), amt(sum(d.lines.map(l => l.total)))],
  ])
}

/** Penawaran / Pesanan per Pelanggan (Belum Proses): document totals of unprocessed and partly processed documents. */
export function openByCustomer(docs: OrderDoc[], from: string, to: string) {
  const ds = open(docs, from, to)
  if (!ds.length) return []
  const names = [...new Set(ds.map(d => d.customer))].sort(asc)
  return [['Pelanggan', 'Total'], ...names.map(n => [n, amt(sum(ds.filter(d => d.customer === n).map(d => d.total)))]), ['Total Pelanggan', amt(sum(ds.map(d => d.total)))]]
}

/** Penawaran / Pesanan per Barang (Belum Proses): ordered and processed quantity and line totals per item, over the lines
 * not yet fully processed (a fully processed line of a partly processed document drops out). Quotations label the item
 * column `Nama Barang`, orders `Nama Barang Barang & Jasa`. */
export function openByItem(docs: OrderDoc[], from: string, to: string) {
  const ls = open(docs, from, to).flatMap(d => d.lines).filter(l => l.processed < l.qty)
  if (!ls.length) return []
  const label = docs[0]?.number.startsWith('SQ') ? 'Nama Barang' : 'Nama Barang Barang & Jasa'
  const names = [...new Set(ls.map(l => l.itemName))].sort(asc)
  const row = (n: string, xs: OrderDocLine[]) => [n, num(sum(xs.map(l => l.qty))), num(sum(xs.map(l => l.processed))), amt(sum(xs.map(l => l.total)))]
  return [[label, 'Kts (Unit#1)', 'Kts Terproses', 'Total Harga'], ...names.map(n => row(n, ls.filter(l => l.itemName === n))), row(`Total ${label}`, ls)]
}
