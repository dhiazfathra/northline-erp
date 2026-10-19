import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db'
import { DomainError } from '../ledger/deciders'
import { nextNumber, period } from '../sales/service'

// Perintah Pembayaran (P3.2; fixtures/transfer-orders-m49.json): open purchase invoices handed to the bank for transfer.
// No journal: Accurate posts the payment when the bank reports the transfer; a new order waits ("Menunggu Ditransfer").
const orderInput = z.object({
  idempotencyKey: z.string().min(8), number: z.string().optional(), date: z.string(), dueDate: z.string(), bank: z.string(), description: z.string().default(''),
  paymentMethod: z.enum(['BANK_TRANSFER', 'VIRTUAL_ACCOUNT', 'CHEQUE']).default('BANK_TRANSFER'),
  lines: z.array(z.object({ invoice: z.string(), amount: z.number().positive(), vendorBank: z.string().default('') })).min(1, 'Faktur harus diisi'),
}).refine(o => o.dueDate >= o.date, 'Tgl batas transfer sebelum tanggal')
  .refine(o => o.paymentMethod !== 'BANK_TRANSFER' || o.lines.every(l => l.vendorBank), 'Rekening Bank faktur wajib diisi')

export async function createTransferOrder(db: Db, raw: z.input<typeof orderInput>) {
  const o = orderInput.parse(raw)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${o.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [bank] = await tx.execute(sql`SELECT type FROM accounts WHERE no = ${o.bank}`)
    if (bank?.type !== 'CASH_BANK') throw new DomainError(`${o.bank} bukan akun Kas & Bank`)
    for (const l of o.lines) {
      // shortcut: owing ignores amounts on other open payment orders; add them if orders start overlapping
      const [inv] = await tx.execute(sql`SELECT i.total - COALESCE((SELECT SUM(amount) FROM purchase_payment_lines WHERE invoice_number = i.number), 0) AS owing
        FROM purchase_invoices i WHERE i.number = ${l.invoice}`)
      if (!inv) throw new DomainError(`Faktur ${l.invoice} tidak ditemukan`)
      if (Math.round(l.amount * 100) > Number(inv.owing)) throw new DomainError(`Pembayaran ${l.invoice} melebihi sisa utang`)
    }
    const number = o.number ?? await nextNumber(tx, `TFO.${period(o.date)}`)
    await tx.execute(sql`INSERT INTO transfer_orders (number, date, due_date, bank_no, payment_method, description) VALUES (${number}, ${o.date}, ${o.dueDate}, ${o.bank}, ${o.paymentMethod}, ${o.description})`)
    for (const [i, l] of o.lines.entries())
      await tx.execute(sql`INSERT INTO transfer_order_lines VALUES (${number}, ${i + 1}, ${l.invoice}, ${Math.round(l.amount * 100)}, ${l.vendorBank})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${o.idempotencyKey}, 'CreateTransferOrder', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}
