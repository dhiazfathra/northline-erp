import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db'
import { DomainError } from '../ledger/deciders'
import { nextNumber, period } from './service'

// Penyesuaian Harga/Diskon Jual: effective-dated selling prices (PRICE) or discount % (DISCOUNT) per price category.
// No journal; rules in docs/reports/SellingPriceAdjustmentDetailReport.md (fixture: fixtures/price-t20.json).

export const sellingPriceAdjustmentInput = z.object({
  number: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(['PRICE', 'DISCOUNT']),
  priceCategory: z.string().default('Umum'),
  description: z.string().default(''),
  /** price in rupiah for PRICE, discPct for DISCOUNT */
  lines: z.array(z.object({ item: z.string(), price: z.number().nonnegative().optional(), discPct: z.number().min(0).max(100).optional() })).min(1),
})

export async function createSellingPriceAdjustment(db: Db, input: z.input<typeof sellingPriceAdjustmentInput>) {
  const a = sellingPriceAdjustmentInput.parse(input)
  for (const l of a.lines) if ((a.kind === 'PRICE' ? l.price : l.discPct) === undefined) throw new DomainError(`Baris ${l.item}: ${a.kind === 'PRICE' ? 'harga' : 'diskon'} wajib diisi`)
  return db.transaction(async tx => {
    const number = a.number ?? await nextNumber(tx, `SPA.${period(a.date)}`)
    await tx.execute(sql`INSERT INTO selling_price_adjustments (number, date, kind, price_category, description) VALUES (${number}, ${a.date}, ${a.kind}, ${a.priceCategory}, ${a.description})`)
    for (const [i, l] of a.lines.entries())
      await tx.execute(sql`INSERT INTO selling_price_adjustment_lines (adjustment_number, seq, item_no, price, disc_pct)
        VALUES (${number}, ${i + 1}, ${l.item}, ${l.price === undefined ? null : Math.round(l.price * 100)}, ${l.discPct ?? null})`)
    return { number }
  })
}
