import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { formatIdr } from './trial-balance'
import { fmtDate } from './general-ledger'

// Pembelian / Penyesuaian Bahan (Harga Pokok Produksi), verified on Manufaktur Demo (fixtures/manufacturing-m49.json):
// the month's stock movements at cost, split into purchases and everything else, grouped by date with a subtotal per date.
const LABEL: Record<string, string> = { PI: 'Faktur Pembelian', PRT: 'Retur Pembelian', IA: 'Penyesuaian Persediaan', SI: 'Faktur Penjualan', SRT: 'Retur Penjualan',
  JC: 'Pekerjaan Pesanan', MA: 'Penambahan Bahan Baku', RO: 'Penyelesaian Pesanan', DO: 'Pengiriman Pesanan', RI: 'Penerimaan Barang' }
// shortcut: only PI/PRT are verified in the purchase section; RI (Penerimaan Barang) is not captured and sits with the adjustments
const PURCHASE = new Set(['PI', 'PRT'])

export interface CostMove { date: string; docType: string; docNumber: string; item: string; value: number }

export async function loadCostMoves(db: Db, from: string, to: string): Promise<CostMove[]> {
  return (await db.execute(sql`SELECT to_char(m.date,'YYYY-MM-DD') AS date, m.doc_type, m.doc_number, i.name, m.value FROM stock_moves m JOIN items i ON i.no = m.item_no
    WHERE m.date BETWEEN ${from} AND ${to} AND m.doc_type <> 'IT' ORDER BY m.date, m.id`))
    .map(r => ({ date: r.date as string, docType: r.doc_type as string, docNumber: r.doc_number as string, item: r.name as string, value: Number(r.value) }))
}

function cogsReport(moves: CostMove[], purchase: boolean, section: string): string[][] {
  const ms = moves.filter(m => PURCHASE.has(m.docType) === purchase)
  const tot = (xs: CostMove[]) => { const i = xs.reduce((s, m) => s + Math.max(m.value, 0), 0), o = xs.reduce((s, m) => s - Math.min(m.value, 0), 0); return [formatIdr(i), formatIdr(o), formatIdr(i - o)] }
  const head = ['Tipe Transaksi', 'Nomor #', 'Nama Barang', 'Nilai Masuk', 'Nilai Keluar', 'Nilai']
  if (!ms.length) return [head]
  return [head, [section], ...[...new Set(ms.map(m => m.date))].flatMap(d => { const day = ms.filter(m => m.date === d)
    return [[fmtDate(d)], ...day.map(m => [LABEL[m.docType] ?? m.docType, m.docNumber, m.item, ...tot([m])]), tot(day)] }), tot(ms)]
}
/** Pembelian (HPP): purchase invoices and purchase returns. */
export const purchaseCogsManufacture = (moves: CostMove[]) => cogsReport(moves, true, 'Pembelian')
/** Penyesuaian Bahan (HPP): every other stock movement (adjustments, sales, job costing). */
export const adjustmentCogsManufacture = (moves: CostMove[]) => cogsReport(moves, false, 'Penyesuaian Bahan')
