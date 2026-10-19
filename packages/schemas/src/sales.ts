import { z } from 'zod'
import { amountToCents, isoDate } from './ledger-es'

// Sales documents (ADR-0005): plain tables that post their journal through the ledger in the same transaction.

const code = z.string().trim().min(1).max(60)

/** taxDocumentCode: DIGUNGGUNG (retail, default) or CTAS_INVOICE (Faktur Pajak); taxType e.g. CTAS_KEPADA_SELAIN_PEMUNGUT_PPN. */
export const customerInput = z.object({ no: code, name: z.string().trim().min(1), arAccount: code, taxDocumentCode: z.string().optional(), taxType: z.string().optional(), /** Limit Piutang */ creditLimit: amountToCents.optional(),
  /** Foreign-currency customer (ADR-0012): ISO code and the Laba/Rugi Terealisasi account for its receipts. */ currency: z.string().length(3).default('IDR'), realizedGainAccount: code.optional(), unrealizedGainAccount: code.optional() })
export const itemInput = z.object({ no: code, name: z.string().trim().min(1), type: z.enum(['SERVICE', 'INVENTORY', 'NON_INVENTORY', 'GROUP']), unit: z.string().min(1), salesAccount: code, expenseAccount: code.optional(), inventoryAccount: code.optional(), cogsAccount: code.optional(), salesReturnAccount: code.optional(), deliveredAccount: code.optional(),
  /** Default tax (taxes.name) applied on taxable invoices; line discounts post to salesDiscountAccount. */ tax: z.string().optional(), salesDiscountAccount: code.optional(),
  /** Barang Grup: component items and quantities (type GROUP). */ components: z.array(z.object({ item: code, qty: z.number().positive() })).default([]) })

/** PPh withholding slip on a receipt/payment line (P3.5): tax = a taxes row with a pph_type; number = No. Bukti Potong. */
const pphInput = z.object({ tax: code, number: z.string().default(''), dpp: amountToCents, rate: z.number().positive().max(100) })

export const salesInvoiceInput = z.object({
  idempotencyKey: z.string().min(8),
  /** Omitted → SI.yyyy.mm.nnnnn */
  number: code.optional(),
  customer: code,
  date: isoDate,
  /** Omitted → the invoice date (cash on delivery, the sandbox's default term). */
  dueDate: isoDate.optional(),
  description: z.string().default(''),
  lines: z.array(z.object({ item: code, name: z.string().min(1), qty: z.number().positive(), price: amountToCents, discPct: z.number().min(0).max(100).default(0),
    /** Tenaga Penjual of the line, in Accurate's order (level 1..5, ADR-0023). */ salesmen: z.array(code).max(5).default([]),
    /** Pesanan Penjualan line this line bills (counts as processed quantity, ADR-0027). */ order: z.object({ number: code, seq: z.number().int().positive() }).optional() })).min(1, 'Detail dari transaksi belum diisi!'), // Accurate's text
  /** PPN: each line's item default tax applies on its DPP (line total less its share of the invoice discount). */
  taxable: z.boolean().default(false),
  /** No. Faktur Pajak (e-Faktur number), entered manually. */
  taxNumber: z.string().optional(),
  /** Installment schedule (Cicilan) of an installment payment term; amounts must add up to the invoice total. */
  installments: z.array(z.object({ name: z.string().min(1), date: isoDate, amount: amountToCents })).default([]),
  /** Invoice discount %, posted to discountAccount. */
  discPct: z.number().min(0).max(100).default(0),
  discountAccount: code.optional(),
  /** Down payments (DP invoices of the same customer) deducted from this invoice. */
  downPayments: z.array(z.object({ invoice: code, amount: amountToCents })).default([]),
  /** Delivery order this invoice bills: stock already left at delivery, the invoice moves its cost to HPP. */
  delivery: code.optional(),
  /** Exchange rate to IDR (ADR-0012); line prices are in the customer's currency. */
  rate: z.number().positive().default(1),
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
  payments: z.array(z.object({ invoice: code, amount: amountToCents, /** installment name being paid */ installment: z.string().optional(),
    /** PPh withheld on this line (bukti potong): DPP × rate %; the line amount still settles the whole invoice. */ pph: pphInput.optional() })).min(1, 'Detail dari transaksi belum diisi!'), // Accurate's text
  /** Amount received; above the sum of payments the excess is a customer credit (kelebihan bayar). Omitted = sum of payments. */
  amount: amountToCents.optional(),
  /** Cek/Giro: the cheque number and its due date (giro mundur until then). */
  cheque: z.object({ no: z.string().min(1), date: isoDate }).optional(),
  /** Exchange rate on the receipt (ADR-0012); payment amounts are in the invoice currency, the bank is IDR. */
  rate: z.number().positive().default(1),
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
  lines: z.array(z.object({ item: code, qty: z.number().positive(), price: amountToCents,
    /** Unique serial numbers received (one unit each), or batch/production numbers with a quantity and optional expiry (ADR-0024). */
    serials: z.array(z.union([z.string().min(1), z.object({ no: z.string().min(1), qty: z.number().positive(), expiry: isoDate.optional() })])).default([]) })).min(1, 'Detail dari transaksi belum diisi!'), // Accurate's text
  /** Receiving warehouse (serial-number stock is per warehouse). */
  warehouse: z.string().default('Utama'),
  /** PPN Masukan from each line's item default tax (ADR-0009). */
  taxable: z.boolean().default(false),
  downPayments: z.array(z.object({ invoice: code, amount: amountToCents })).default([]),
  /** Biaya tab: expense lines debited straight to their account (fixtures/purchase-expense-t25.json). */
  expenses: z.array(z.object({ account: code, amount: amountToCents, name: z.string().default('') })).default([]),
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
  payments: z.array(z.object({ invoice: code, amount: amountToCents, /** PPh withheld on this line (bukti potong): DPP × rate %; the line amount still settles the whole invoice. */ pph: pphInput.optional() })).min(1, 'Detail dari transaksi belum diisi!'), // Accurate's text
})
export type PurchasePaymentInput = z.input<typeof purchasePaymentInput>

/** Return against one invoice (Accurate's default return type "INVOICE"). */
export const returnInput = z.object({
  idempotencyKey: z.string().min(8),
  number: code.optional(),
  invoice: code,
  date: isoDate,
  description: z.string().default(''),
  lines: z.array(z.object({ item: code, qty: z.number().positive(), price: amountToCents,
    /** Invoice line returned (its seq); the return line takes that line's salesmen (ADR-0023). */ invoiceSeq: z.number().int().positive().optional() })).min(1, 'Detail dari transaksi belum diisi!'), // Accurate's text
})
export type ReturnInput = z.input<typeof returnInput>

/** Uang Muka Penjualan: an invoice of kind DP, Dr receivable / Cr the down-payment liability account. */
export const salesDownPaymentInput = z.object({
  idempotencyKey: z.string().min(8),
  number: code.optional(),
  customer: code,
  date: isoDate,
  description: z.string().default(''),
  // Accurate's text for a zero down payment (docs/parity/penjualan/uang-muka-penjualan)
  amount: z.union([z.number(), z.string()]).refine(v => Number(v) > 0, 'Uang muka harus lebih besar dari nol').pipe(amountToCents),
  dpAccount: code,
})
export type SalesDownPaymentInput = z.input<typeof salesDownPaymentInput>

/** Uang Muka Pembelian: a purchase invoice of kind DP, Dr down-payment asset / Cr payable. */
export const purchaseDownPaymentInput = z.object({
  idempotencyKey: z.string().min(8), number: code.optional(), vendor: code, bill: code, date: isoDate,
  description: z.string().default(''), amount: amountToCents, dpAccount: code,
})
export type PurchaseDownPaymentInput = z.input<typeof purchaseDownPaymentInput>
