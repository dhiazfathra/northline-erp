import { z } from 'zod'

export const docTypes = [
  'sales-quotation',
  'sales-order',
  'sales-invoice',
  'sales-receipt',
  'purchase-order',
  'purchase-invoice',
  'purchase-payment',
  'cash-receipt',
  'cash-payment',
  'journal',
  'stock-adjustment',
] as const
export const docTypeSchema = z.enum(docTypes)
export type DocType = z.infer<typeof docTypeSchema>

export const docStatusSchema = z.enum(['draft', 'approved', 'paid', 'unpaid'])
export type DocStatus = z.infer<typeof docStatusSchema>

export const docRowSchema = z.object({
  id: z.string(),
  no: z.string(),
  date: z.string(),
  party: z.string(),
  note: z.string(),
  status: docStatusSchema,
  total: z.number(),
})
export type DocRow = z.infer<typeof docRowSchema>

export const docItemSchema = z.object({
  name: z.string(),
  sku: z.string(),
  qty: z.number().positive(),
  price: z.number().nonnegative(),
})
export type DocItem = z.infer<typeof docItemSchema>

export const newDocSchema = z.object({
  party: z.string().min(1),
  date: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  autoNo: z.boolean(),
  items: z.array(docItemSchema).min(1),
})
export type NewDocInput = z.infer<typeof newDocSchema>
