import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db'
import { fmtDate } from './general-ledger'
import { itemSales, type SalesData } from './receivables'
import { formatIdr } from './trial-balance'

// Target Penjualan (Anggaran dan Target feature) and its three reports; rules in docs/reports/ItemSalesTargetReport.md
// (fixture: fixtures/targets-t21.json). Riil = sales at DPP in the target's range, as in the sales item views.

export const salesTargetInput = z.object({
  name: z.string().min(1), kind: z.enum(['ITEM', 'CATEGORY', 'GENERAL']), year: z.number().int(),
  from: z.string(), to: z.string(), analyst: z.string().default(''),
  lines: z.array(z.object({ item: z.string().optional(), category: z.string().optional(), month: z.number().int().min(1).max(12).optional(), qty: z.number().default(0), amount: z.number().positive() })).min(1),
})
export async function saveSalesTarget(db: Db, input: z.input<typeof salesTargetInput>) {
  const t = salesTargetInput.parse(input)
  await db.transaction(async tx => {
    await tx.execute(sql`INSERT INTO sales_targets (name, kind, year, from_date, to_date, analyst) VALUES (${t.name}, ${t.kind}, ${t.year}, ${t.from}, ${t.to}, ${t.analyst})`)
    for (const [i, l] of t.lines.entries())
      await tx.execute(sql`INSERT INTO sales_target_lines (target_name, seq, item_no, category, month, quantity, amount)
        VALUES (${t.name}, ${i + 1}, ${l.item ?? null}, ${l.category ?? null}, ${l.month ?? null}, ${l.qty}, ${Math.round(l.amount * 100)})`)
  })
}

export interface SalesTarget { name: string; kind: 'ITEM' | 'CATEGORY' | 'GENERAL'; year: number; from: string; to: string; analyst: string
  lines: { item?: string; itemName?: string; category?: string; month?: number; qty: number; amount: number }[] }
export async function loadSalesTargets(db: Db): Promise<SalesTarget[]> {
  const ls = await db.execute(sql`SELECT l.*, i.name AS item_name FROM sales_target_lines l LEFT JOIN items i ON i.no = l.item_no ORDER BY l.target_name, l.seq`)
  return (await db.execute(sql`SELECT name, kind, year, to_char(from_date,'YYYY-MM-DD') AS f, to_char(to_date,'YYYY-MM-DD') AS t, analyst FROM sales_targets ORDER BY name`))
    .map(r => ({ name: r.name as string, kind: r.kind as SalesTarget['kind'], year: Number(r.year), from: r.f as string, to: r.t as string, analyst: r.analyst as string,
      lines: ls.filter(l => l.target_name === r.name).map(l => ({ item: (l.item_no as string) ?? undefined, itemName: (l.item_name as string) ?? undefined, category: (l.category as string) ?? undefined,
        month: l.month === null ? undefined : Number(l.month), qty: Number(l.quantity), amount: Number(l.amount) })) }))
}

/** Pencapaian % = riil / target × 100, two decimals with trailing zeros dropped ("75", "81,65", "0"). */
const pct = (riil: number, target: number) => (target ? String(Math.round(riil / target * 10_000) / 100).replace('.', ',') : '0')
const qtyFmt = (q: number) => formatIdr(Math.round(q * 100))
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const head = (title: string, year: number) => [[title], [`per ${year}`], ['Cabang : [Semua Cabang]']]
const rangeHead = (t: SalesTarget) => [['Nama Target', ':', t.name, 'S/d Tanggal', ':', fmtDate(t.to)], ['Dari Tanggal', ':', fmtDate(t.from), 'Penganalisa', ':', t.analyst]]
const total = (ls: { amount: number }[], riil: number[]) => [formatIdr(ls.reduce((s, l) => s + l.amount, 0)), formatIdr(riil.reduce((s, v) => s + v, 0))]

/** Target Penjualan Barang: per target of the year, per item: target qty/value vs sold qty/value in [from, to]. */
export function itemTargets(ts: SalesTarget[], d: SalesData, year: number): string[][] {
  const rows: string[][] = []
  for (const t of ts.filter(t => t.kind === 'ITEM' && t.year === year)) {
    const sales = itemSales(d, t.from, t.to), riil: number[] = []
    rows.push(...head('Target Penjualan Barang', year), ...rangeHead(t), ['Nama Barang Barang & Jasa', 'Kuantitas', 'Nilai Target', 'Kts Riil', 'Nilai Riil', 'Pencapaian Kts (%)', 'Pencapaian (%)'])
    for (const l of t.lines) {
      const s = sales.filter(x => x.line.item === l.item), q = s.reduce((a, x) => a + x.qty, 0), v = s.reduce((a, x) => a + x.value, 0)
      riil.push(v)
      rows.push([l.itemName!, qtyFmt(l.qty), formatIdr(l.amount), qtyFmt(q), formatIdr(v), pct(q, l.qty), pct(v, l.amount)])
    }
    rows.push(total(t.lines, riil))
  }
  return rows
}

/** Target Penjualan per Kategori: every ERP item is in category "Umum", so the category's riil is all item sales in range. */
// shortcut: no item categories in the ERP; add a category per item when categories are modelled.
export function categoryTargets(ts: SalesTarget[], d: SalesData, year: number): string[][] {
  const rows: string[][] = []
  for (const t of ts.filter(t => t.kind === 'CATEGORY' && t.year === year)) {
    const v = itemSales(d, t.from, t.to).reduce((a, x) => a + x.value, 0), riil: number[] = []
    rows.push(...head('Target Penjualan per Kategori', year), ...rangeHead(t), ['Nama Kategori Barang', 'Nilai Target', 'Nilai Riil', 'Pencapaian (%)'])
    for (const l of t.lines) { const r = l.category === 'Umum' ? v : 0; riil.push(r); rows.push([l.category!, formatIdr(l.amount), formatIdr(r), pct(r, l.amount)]) }
    rows.push(total(t.lines, riil))
  }
  return rows
}

/** Target Penjualan per Bulan: per month line, that calendar month's sales of the target year. */
export function generalTargets(ts: SalesTarget[], d: SalesData, year: number): string[][] {
  const rows: string[][] = []
  for (const t of ts.filter(t => t.kind === 'GENERAL' && t.year === year)) {
    const riil: number[] = []
    rows.push(...head('Target Penjualan per Bulan', year), ['Nama Target', ':', t.name, 'Penganalisa', ':', t.analyst], ['Tahun', ':', String(year)], ['Bulan', 'Nilai Target', 'Nilai Riil', 'Pencapaian (%)'])
    for (const l of [...t.lines].sort((a, b) => a.month! - b.month!)) {
      const m = String(l.month).padStart(2, '0'), last = new Date(Date.UTC(year, l.month!, 0)).getUTCDate()
      const v = itemSales(d, `${year}-${m}-01`, `${year}-${m}-${last}`).reduce((a, x) => a + x.value, 0)
      riil.push(v)
      rows.push([MONTHS_ID[l.month! - 1]!, formatIdr(l.amount), formatIdr(v), pct(v, l.amount)])
    }
    rows.push(total(t.lines, riil))
  }
  return rows
}
