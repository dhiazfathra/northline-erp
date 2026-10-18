import { z } from 'zod'
import { amountToCents, isoDate } from './ledger-es'

// Sales documents (ADR-0005): plain tables that post their journal through the ledger in the same transaction.

const code = z.string().trim().min(1).max(60)

export const customerInput = z.object({ no: code, name: z.string().trim().min(1), arAccount: code })
export const itemInput = z.object({ no: code, name: z.string().trim().min(1), type: z.enum(['SERVICE', 'INVENTORY', 'NON_INVENTORY']), unit: z.string().min(1), salesAccount: code, expenseAccount: code.optional(), inventoryAccount: code.optional(), cogsAccount: code.optional(), salesReturnAccount: code.optional(), deliveredAccount: code.optional(),
  /** Default tax (taxes.name) applied on taxable invoices; line discounts post to salesDiscountAccount. */ tax: z.string().optional(), salesDiscountAccount: code.optional() })

export const salesInvoiceInput = z.object({
  idempotencyKey: z.string().min(8),
  /** Omitted → SI.yyyy.mm.nnnnn */
  number: code.optional(),
  customer: code,
  date: isoDate,
  /** Omitted → the invoice date (cash on delivery, the sandbox's default term). */
  dueDate: isoDate.optional(),
  description: z.string().default(''),
  lines: z.array(z.object({ item: code, name: z.string().min(1), qty: z.number().positive(), price: amountToCents, discPct: z.number().min(0).max(100).default(0) })).min(1),
  /** PPN: each line's item default tax applies on its DPP (line total less its share of the invoice discount). */
  taxable: z.boolean().default(false),
  /** Invoice discount %, posted to discountAccount. */
  discPct: z.number().min(0).max(100).default(0),
  discountAccount: code.optional(),
  /** Down payments (DP invoices of the same customer) deducted from this invoice. */
  downPayments: z.array(z.object({ invoice: code, amount: amountToCents })).default([]),
  /** Delivery order this invoice bills: stock already left at delivery, the invoice moves its cost to HPP. */
  delivery: code.optional(),
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

// Purchases mirror sales (ADR-0005): Dr item expense / Cr vendor payable; payment Dr payable / Cr bank.
export const vendorInput = z.object({ no: code, name: z.string().trim().min(1), apAccount: code })
export const purchaseInvoiceInput = z.object({
  idempotencyKey: z.string().min(8),
  /** Omitted → PI.yyyy.mm.nnnnn */
  number: code.optional(),
  vendor: code,
  /** The vendor's own invoice number; unique per vendor. */
  bill: code,
  date: isoDate,
  dueDate: isoDate.optional(),
  description: z.string().default(''),
  lines: z.array(z.object({ item: code, qty: z.number().positive(), price: amountToCents })).min(1),
  /** PPN Masukan from each line's item default tax (ADR-0009). */
  taxable: z.boolean().default(false),
  downPayments: z.array(z.object({ invoice: code, amount: amountToCents })).default([]),
})
export type PurchaseInvoiceInput = z.input<typeof purchaseInvoiceInput>
export const purchasePaymentInput = z.object({
  idempotencyKey: z.string().min(8),
  /** Omitted → <bank account no>.yyyy.mm.nnnnn (shared with receipts of the same bank) */
  number: code.optional(),
  vendor: code,
  bank: code,
  date: isoDate,
  description: z.string().default(''),
  payments: z.array(z.object({ invoice: code, amount: amountToCents })).min(1),
})
export type PurchasePaymentInput = z.input<typeof purchasePaymentInput>

/** Return against one invoice (Accurate's default return type "INVOICE"). */
export const returnInput = z.object({
  idempotencyKey: z.string().min(8),
  number: code.optional(),
  invoice: code,
  date: isoDate,
  description: z.string().default(''),
  lines: z.array(z.object({ item: code, qty: z.number().positive(), price: amountToCents })).min(1),
})
export type ReturnInput = z.input<typeof returnInput>

/** Uang Muka Penjualan: an invoice of kind DP, Dr receivable / Cr the down-payment liability account. */
export const salesDownPaymentInput = z.object({
  idempotencyKey: z.string().min(8),
  number: code.optional(),
  customer: code,
  date: isoDate,
  description: z.string().default(''),
  amount: amountToCents,
  dpAccount: code,
})
export type SalesDownPaymentInput = z.input<typeof salesDownPaymentInput>

/** Uang Muka Pembelian: a purchase invoice of kind DP, Dr down-payment asset / Cr payable. */
export const purchaseDownPaymentInput = z.object({
  idempotencyKey: z.string().min(8), number: code.optional(), vendor: code, bill: code, date: isoDate,
  description: z.string().default(''), amount: amountToCents, dpAccount: code,
})
export type PurchaseDownPaymentInput = z.input<typeof purchaseDownPaymentInput>
