import { z } from 'zod'
import type { JournalLine } from './fixtures'

export const docTypes = [
  'sales-quotation',
  'sales-order',
  'sales-down-payment',
  'sales-invoice',
  'sales-receipt',
  'sales-return',
  'purchase-order',
  'purchase-invoice',
  'purchase-payment',
  'purchase-return',
  'cash-receipt',
  'cash-payment',
  'journal',
  'stock-adjustment',
] as const
export const docTypeSchema = z.enum(docTypes)
export type DocType = z.infer<typeof docTypeSchema>

/** Which form a doc type opens. */
export type DocKind = 'journal' | 'items' | 'payment'

export type DocStatus = 'unpaid' | 'partial' | 'paid'

const date = z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/)
const head = { date, autoNo: z.boolean(), number: z.string(), description: z.string() }

export const itemLineSchema = z.object({
  code: z.string(),
  name: z.string(),
  unit: z.string(),
  qty: z.number().positive(),
  price: z.number().nonnegative(),
  discPct: z.number().min(0).max(100),
})
export type ItemLine = z.infer<typeof itemLineSchema>

// Error keys are field names; the form turns them into "<Label> harus diisi".
export const itemDocSchema = z.object({
  ...head,
  party: z.string().min(1),
  items: z.array(itemLineSchema).min(1),
  discPct: z.number().min(0).max(100),
  taxable: z.boolean(),
  inclusive: z.boolean(),
  terms: z.string(),
  poNo: z.string(),
  supplierNo: z.string(),
  /** Down payments applied to this invoice (doc numbers). */
  dp: z.array(z.string()),
  /** Returns: the invoice the goods came from. */
  invoice: z.string(),
})
export type ItemDocInput = z.infer<typeof itemDocSchema>
/** Header fields an item doc type stores (ADR-0049): the form shows only these, the API refuses the rest set. No type stores poNo. */
export const storedInfo: Partial<Record<DocType, readonly ('discPct' | 'taxable' | 'terms')[]>> = {
  'sales-invoice': ['discPct', 'taxable', 'terms'],
  'purchase-invoice': ['taxable', 'terms'],
}
export const purchaseInvoiceSchema = itemDocSchema.extend({ supplierNo: z.string().trim().min(1) })
export const returnDocSchema = itemDocSchema.extend({ invoice: z.string().min(1) })

export const journalLineSchema = z.object({
  account: z.string().min(1),
  debit: z.number().nonnegative(),
  credit: z.number().nonnegative(),
  memo: z.string(),
})
export const journalDocSchema = z.object({ ...head, lines: z.array(journalLineSchema).min(1) })
export type JournalDocInput = z.infer<typeof journalDocSchema>

export const payLineSchema = z.object({
  invoice: z.string(),
  date: z.string(),
  total: z.number(),
  owing: z.number(),
  dpp: z.number(),
  pay: z.number().nonnegative(),
  discount: z.number().nonnegative(),
  pph: z.boolean(),
})
export type PayLine = z.infer<typeof payLineSchema>
export const paymentDocSchema = z.object({
  ...head,
  party: z.string().min(1),
  bank: z.string().min(1),
  amount: z.number().nonnegative(),
  lines: z.array(payLineSchema).min(1),
})
export type PaymentDocInput = z.infer<typeof paymentDocSchema>

export type DocValues = ItemDocInput | JournalDocInput | PaymentDocInput

export interface DocRecord {
  id: string
  type: DocType | null
  no: string
  jv: string
  date: string
  party: string
  description: string
  /** Fixture source label, e.g. "Faktur Penjualan"; tags system journals. */
  source: string
  total: number
  lines: JournalLine[]
  values?: DocValues
}

export interface DocRow extends DocRecord {
  status?: DocStatus
  paid: number
}
