import { z } from 'zod'
import { amountToCents, isoDate } from './ledger-es'

// Sales documents (ADR-0005): plain tables that post their journal through the ledger in the same transaction.

const code = z.string().trim().min(1).max(60)

export const customerInput = z.object({ no: code, name: z.string().trim().min(1), arAccount: code })
export const itemInput = z.object({ no: code, name: z.string().trim().min(1), type: z.enum(['SERVICE', 'INVENTORY', 'NON_INVENTORY']), unit: z.string().min(1), salesAccount: code })

export const salesInvoiceInput = z.object({
  idempotencyKey: z.string().min(8),
  /** Omitted → SI.yyyy.mm.nnnnn */
  number: code.optional(),
  customer: code,
  date: isoDate,
  /** Omitted → the invoice date (cash on delivery, the sandbox's default term). */
  dueDate: isoDate.optional(),
  description: z.string().default(''),
  lines: z.array(z.object({ item: code, name: z.string().min(1), qty: z.number().positive(), price: amountToCents })).min(1),
})
export type SalesInvoiceInput = z.input<typeof salesInvoiceInput>

export const salesReceiptInput = z.object({
  idempotencyKey: z.string().min(8),
  /** Omitted → <bank account no>.yyyy.mm.nnnnn */
  number: code.optional(),
  customer: code,
  bank: code,
  date: isoDate,
  description: z.string().default(''),
  payments: z.array(z.object({ invoice: code, amount: amountToCents })).min(1),
})
export type SalesReceiptInput = z.input<typeof salesReceiptInput>
