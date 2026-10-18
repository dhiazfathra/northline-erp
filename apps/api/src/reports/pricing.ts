import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { fmtDate, fmtHeaderDate } from './general-ledger'
import { formatIdr } from './trial-balance'

// Penyesuaian Harga/Diskon Jual reports; rules in docs/reports/SellingPriceAdjustmentDetailReport.md (fixture: fixtures/price-t20.json).

export interface PriceAdjustment { number: string; date: string; kind: 'PRICE' | 'DISCOUNT'; category: string
  lines: { item: string; itemName: string; unit: string; price: number | null; discPct: number | null }[] }

export async function loadPriceAdjustments(db: Db): Promise<PriceAdjustment[]> {
  const ls = await db.execute(sql`SELECT l.adjustment_number, l.item_no, i.name, i.unit, l.price, l.disc_pct FROM selling_price_adjustment_lines l JOIN items i ON i.no = l.item_no ORDER BY l.adjustment_number, l.seq`)
  return (await db.execute(sql`SELECT number, to_char(date,'YYYY-MM-DD') AS date, kind, price_category FROM selling_price_adjustments ORDER BY date, number`))
    .map(a => ({ number: a.number as string, date: a.date as string, kind: a.kind as 'PRICE' | 'DISCOUNT', category: a.price_category as string,
      lines: ls.filter(l => l.adjustment_number === a.number).map(l => ({ item: l.item_no as string, itemName: l.name as string, unit: l.unit as string,
        price: l.price === null ? null : Number(l.price), discPct: l.disc_pct === null ? null : Number(l.disc_pct) })) }))
}

const head = (title: string, from: string, to: string) => [[title], [`Dari ${fmtHeaderDate(from)} s/d ${fmtHeaderDate(to)}`], ['Cabang : [Semua Cabang]']]
const inRange = (as: PriceAdjustment[], kind: 'PRICE' | 'DISCOUNT', from: string, to: string) => as.filter(a => a.kind === kind && a.date >= from && a.date <= to)
const pct = (n: number | null) => (n === null ? '' : String(n).replace('.', ','))

/**
 * Penyesuaian Harga Jual / Diskon Jual: one block per document (title repeated per block, as Accurate pages each).
 * Harga Lama / Harga Minimum are the item master's default price and minimum (0: not modelled), not the previous
 * adjustment (SPA.2035.12.00003 still shows 0). Diskon Lama is blank, so its cell drops out.
 */
export function adjustmentDetail(as: PriceAdjustment[], kind: 'PRICE' | 'DISCOUNT', from: string, to: string): string[][] {
  const rows: string[][] = []
  for (const a of inRange(as, kind, from, to)) {
    rows.push(...head(kind === 'PRICE' ? 'Penyesuaian Harga Jual' : 'Penyesuaian Diskon Jual', from, to),
      ['Nomor #', ':', a.number, 'Kategori Penjualan', ':', a.category],
      ['Mulai Berlaku', ':', fmtDate(a.date), 'Berlaku di Cabang', ':', '[Semua Cabang]'])
    if (kind === 'PRICE') rows.push(['Tanggal Berakhir', ':'], ['Kode #', 'Nama Barang', 'Harga Baru', 'Harga Lama', 'Harga Minimum'],
      ...a.lines.map(l => [l.item, l.itemName, formatIdr(l.price!), '0', '0']))
    else rows.push(['Kode #', 'Nama Barang', 'Diskon (%)', 'Diskon Lama (%)'], ...a.lines.map(l => [l.item, l.itemName, pct(l.discPct)]))
  }
  return rows
}

/** … per Kategori: per item (name order), each adjustment line with one column per price category; name only on the item's first row. */
export function adjustmentPerCategory(as: PriceAdjustment[], kind: 'PRICE' | 'DISCOUNT', from: string, to: string): string[][] {
  const docs = inRange(as, kind, from, to), cats = [...new Set(docs.map(a => a.category))].sort()
  const rows = [...head(kind === 'PRICE' ? 'Penyesuaian Harga Jual per Kategori' : 'Penyesuaian Diskon Jual per Kategori', from, to), ['Nama Barang', 'Nomor #', 'Mulai Berlaku', ...cats]]
  const entries = docs.flatMap(a => a.lines.map(l => ({ a, l })))
  for (const name of [...new Set(entries.map(e => e.l.itemName))].sort((x, y) => x.localeCompare(y)))
    entries.filter(e => e.l.itemName === name).forEach((e, i) =>
      rows.push([...(i === 0 ? [name] : []), e.a.number, fmtDate(e.a.date), ...cats.map(c => (c === e.a.category ? (kind === 'PRICE' ? formatIdr(e.l.price!) : pct(e.l.discPct)) : ''))].filter(c => c !== '')))
  return rows
}

/** Perubahan Harga Jual Per Barang: per item, each price change in range with the previous adjusted price (0 if none) as Harga Lama. */
export function priceHistory(as: PriceAdjustment[], from: string, to: string): string[][] {
  const rows = [...head('Perubahan Harga Jual Per Barang', from, to), ['Mulai Berlaku', 'Kategori Penjualan', 'Mata Uang', 'Harga Lama', 'Harga Baru', 'Satuan']]
  const prices = as.filter(a => a.kind === 'PRICE').flatMap(a => a.lines.map(l => ({ a, l })))
  for (const name of [...new Set(prices.filter(e => e.a.date >= from && e.a.date <= to).map(e => e.l.itemName))].sort((x, y) => x.localeCompare(y))) {
    rows.push([name])
    let last = 0
    for (const e of prices.filter(e => e.l.itemName === name)) {
      if (e.a.date >= from && e.a.date <= to) rows.push([fmtDate(e.a.date), e.a.category, 'IDR', formatIdr(last), formatIdr(e.l.price!), e.l.unit])
      last = e.l.price!
    }
  }
  return rows
}
