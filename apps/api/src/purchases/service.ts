import { sql } from 'drizzle-orm'
import { purchaseDownPaymentInput, purchaseInvoiceInput, purchasePaymentInput, vendorInput, type PurchaseDownPaymentInput, type PurchaseInvoiceInput, type PurchasePaymentInput } from '@northline/schemas/sales'
import { z } from 'zod'
import type { Db } from '../db'
import { DomainError } from '../ledger/deciders'
import { handleTx } from '../ledger/handler'
import { merge, nextNumber, period } from '../sales/service'
import { addMove } from '../inventory/fifo'

// Mirror of sales/service.ts (ADR-0005); see fixtures/purchase-t3.json for the journals Accurate posts.

export async function upsertVendor(db: Db, input: z.input<typeof vendorInput>) {
  const v = vendorInput.parse(input)
  await db.execute(sql`INSERT INTO vendors (no, name, ap_account) VALUES (${v.no}, ${v.name}, ${v.apAccount})
    ON CONFLICT (no) DO UPDATE SET name = EXCLUDED.name, ap_account = EXCLUDED.ap_account`)
}

const rupiah = (cents: number) => (cents / 100).toFixed(2)

export async function createPurchaseInvoice(db: Db, input: PurchaseInvoiceInput) {
  const inv = purchaseInvoiceInput.parse(input)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${inv.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [vendor] = await tx.execute(sql`SELECT ap_account FROM vendors WHERE no = ${inv.vendor}`)
    if (!vendor) throw new DomainError(`Pemasok ${inv.vendor} tidak ditemukan`)
    const [dup] = await tx.execute(sql`SELECT 1 FROM purchase_invoices WHERE vendor_no = ${inv.vendor} AND bill_number = ${inv.bill}`)
    if (dup) throw new DomainError(`No Faktur "${inv.bill}" sudah ada untuk pemasok ${inv.vendor}`)
    // stock items debit their inventory account; services/non-stock their expense account
    const items = new Map((await tx.execute(sql`SELECT no, type, CASE WHEN type = 'INVENTORY' THEN inventory_account ELSE expense_account END AS account FROM items`))
      .map(r => [r.no as string, r.account as string | null]))
    const stockItems = new Set((await tx.execute(sql`SELECT no FROM items WHERE type = 'INVENTORY'`)).map(r => r.no as string))
    const lines = inv.lines.map((l, i) => {
      const acc = items.get(l.item)
      if (acc === undefined) throw new DomainError(`Barang ${l.item} tidak ditemukan`)
      if (!acc) throw new DomainError(`Barang ${l.item} belum punya akun beban/persediaan`)
      return { ...l, seq: i + 1, account: acc, total: Math.round(l.qty * l.price) }
    })
    const total = lines.reduce((s, l) => s + l.total, 0)
    const number = inv.number ?? await nextNumber(tx, `PI.${period(inv.date)}`)
    const dps: { dp: string; amount: number; account: string }[] = []
    for (const u of inv.downPayments) {
      const [dp] = await tx.execute(sql`SELECT i.vendor_no, i.dp_account, i.total - COALESCE((SELECT SUM(amount) FROM purchase_dp_usages WHERE dp_number = i.number), 0) AS left
        FROM purchase_invoices i WHERE i.number = ${u.invoice} AND i.kind = 'DP' FOR UPDATE`)
      if (!dp || dp.vendor_no !== inv.vendor) throw new DomainError(`Uang muka ${u.invoice} tidak ditemukan untuk pemasok ini`)
      if (u.amount > Number(dp.left)) throw new DomainError(`Uang muka ${u.invoice} tidak cukup`)
      dps.push({ dp: u.invoice, amount: u.amount, account: dp.dp_account as string })
    }
    const dpUsed = dps.reduce((s, d) => s + d.amount, 0)
    if (dpUsed > total) throw new DomainError('Uang muka melebihi total faktur')
    const journalId = crypto.randomUUID()
    // Accurate prints the expense debits first, then the payable credit.
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${inv.idempotencyKey}:journal`, journalId, number, sourceType: 'PI', date: inv.date, description: inv.description,
      lines: [
        ...merge(lines.map(l => ({ account: l.account, amount: l.total }))).map(d => ({ account: d.account, side: 'DEBIT' as const, amount: rupiah(d.amount) })),
        ...(total - dpUsed ? [{ account: vendor.ap_account as string, side: 'CREDIT' as const, amount: rupiah(total - dpUsed) }] : []),
        ...merge(dps).map(d => ({ account: d.account, side: 'CREDIT' as const, amount: rupiah(d.amount) })),
      ],
    })
    await tx.execute(sql`INSERT INTO purchase_invoices (number, vendor_no, bill_number, date, due_date, description, total, journal_id)
      VALUES (${number}, ${inv.vendor}, ${inv.bill}, ${inv.date}, ${inv.dueDate ?? inv.date}, ${inv.description}, ${total}, ${journalId})`)
    for (const d of dps) await tx.execute(sql`INSERT INTO purchase_dp_usages (invoice_number, dp_number, amount) VALUES (${number}, ${d.dp}, ${d.amount})`)
    for (const l of lines.filter(l => stockItems.has(l.item)))
      await addMove(tx, { item: l.item, date: inv.date, docType: 'PI', docNumber: number, description: inv.description, quantity: l.qty, value: l.total })
    for (const l of lines)
      await tx.execute(sql`INSERT INTO purchase_invoice_lines (invoice_number, seq, item_no, quantity, unit_price, total) VALUES (${number}, ${l.seq}, ${l.item}, ${l.qty}, ${l.price}, ${l.total})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${inv.idempotencyKey}, 'CreatePurchaseInvoice', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

export async function createPurchasePayment(db: Db, input: PurchasePaymentInput) {
  const pp = purchasePaymentInput.parse(input)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${pp.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [bank] = await tx.execute(sql`SELECT type FROM accounts WHERE no = ${pp.bank}`)
    if (bank?.type !== 'CASH_BANK') throw new DomainError(`${pp.bank} bukan akun Kas & Bank`)
    const debits: { account: string; amount: number }[] = []
    for (const p of pp.payments) {
      const [inv] = await tx.execute(sql`
        SELECT i.vendor_no, v.ap_account, i.total - COALESCE((SELECT SUM(amount) FROM purchase_payment_lines WHERE invoice_number = i.number), 0) AS owing
        FROM purchase_invoices i JOIN vendors v ON v.no = i.vendor_no WHERE i.number = ${p.invoice} FOR UPDATE OF i`)
      if (!inv) throw new DomainError(`Faktur ${p.invoice} tidak ditemukan`)
      if (inv.vendor_no !== pp.vendor) throw new DomainError(`Faktur ${p.invoice} bukan milik pemasok ${pp.vendor}`)
      if (p.amount > Number(inv.owing)) throw new DomainError(`Pembayaran ${p.invoice} melebihi sisa utang`)
      debits.push({ account: inv.ap_account as string, amount: p.amount })
    }
    const amount = pp.payments.reduce((s, p) => s + p.amount, 0)
    const number = pp.number ?? await nextNumber(tx, `${pp.bank}.${period(pp.date)}`)
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${pp.idempotencyKey}:journal`, journalId, number, sourceType: 'PP', date: pp.date, description: pp.description,
      lines: [...merge(debits).map(d => ({ account: d.account, side: 'DEBIT' as const, amount: rupiah(d.amount) })), { account: pp.bank, side: 'CREDIT', amount: rupiah(amount) }],
    })
    await tx.execute(sql`INSERT INTO purchase_payments (number, vendor_no, bank_no, date, description, amount, journal_id)
      VALUES (${number}, ${pp.vendor}, ${pp.bank}, ${pp.date}, ${pp.description}, ${amount}, ${journalId})`)
    for (const p of pp.payments)
      await tx.execute(sql`INSERT INTO purchase_payment_lines (payment_number, invoice_number, amount) VALUES (${number}, ${p.invoice}, ${p.amount})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${pp.idempotencyKey}, 'CreatePurchasePayment', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

export async function createPurchaseDownPayment(db: Db, input: PurchaseDownPaymentInput) {
  const dp = purchaseDownPaymentInput.parse(input)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${dp.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [vendor] = await tx.execute(sql`SELECT ap_account FROM vendors WHERE no = ${dp.vendor}`)
    if (!vendor) throw new DomainError(`Pemasok ${dp.vendor} tidak ditemukan`)
    const number = dp.number ?? await nextNumber(tx, `PI.${period(dp.date)}`)
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${dp.idempotencyKey}:journal`, journalId, number, sourceType: 'PDP', date: dp.date, description: dp.description,
      lines: [{ account: dp.dpAccount, side: 'DEBIT', amount: rupiah(dp.amount) }, { account: vendor.ap_account as string, side: 'CREDIT', amount: rupiah(dp.amount) }],
    })
    await tx.execute(sql`INSERT INTO purchase_invoices (number, vendor_no, bill_number, date, due_date, description, total, journal_id, kind, dp_account)
      VALUES (${number}, ${dp.vendor}, ${dp.bill}, ${dp.date}, ${dp.date}, ${dp.description}, ${dp.amount}, ${journalId}, 'DP', ${dp.dpAccount})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${dp.idempotencyKey}, 'CreatePurchaseDownPayment', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

const orderInput = z.object({ number: z.string().optional(), vendor: z.string(), date: z.string(), description: z.string().default(''),
  lines: z.array(z.object({ item: z.string(), qty: z.number().positive(), price: z.number().nonnegative().optional() })).min(1) })

/** Pesanan Pembelian: no journal. */
export async function createPurchaseOrder(db: Db, input: z.input<typeof orderInput>) {
  const o = orderInput.parse(input)
  return db.transaction(async tx => {
    const number = o.number ?? await nextNumber(tx, `PO.${period(o.date)}`)
    const ls = o.lines.map(l => ({ ...l, price: Math.round((l.price ?? 0) * 100), total: Math.round(l.qty * (l.price ?? 0) * 100) }))
    await tx.execute(sql`INSERT INTO purchase_orders (number, vendor_no, date, description, total) VALUES (${number}, ${o.vendor}, ${o.date}, ${o.description}, ${ls.reduce((s, l) => s + l.total, 0)})`)
    for (const [i, l] of ls.entries()) await tx.execute(sql`INSERT INTO purchase_order_lines VALUES (${number}, ${i + 1}, ${l.item}, ${l.qty}, ${l.price}, ${l.total})`)
    return { number }
  })
}

/** Penerimaan Barang: quantities only; stock value arrives with the purchase invoice.
 *  shortcut: receipt does not move stock here; stock moves on the invoice (matches the unlinked sandbox case), link receipts to invoices when GRNI is modelled. */
export async function createReceiveItem(db: Db, input: z.input<typeof orderInput> & { receiveNumber: string }) {
  const o = orderInput.parse(input)
  return db.transaction(async tx => {
    const number = o.number ?? await nextNumber(tx, `RI.${period(o.date)}`)
    await tx.execute(sql`INSERT INTO receive_items (number, vendor_no, date, receive_number, description) VALUES (${number}, ${o.vendor}, ${o.date}, ${input.receiveNumber}, ${o.description})`)
    for (const [i, l] of o.lines.entries()) {
      await tx.execute(sql`INSERT INTO receive_item_lines VALUES (${number}, ${i + 1}, ${l.item}, ${l.qty})`)
      // Unlinked receipt: Accurate adds the quantity at zero value (fixtures/adjustment-t10.json opens at 21 units).
      const [st] = await tx.execute(sql`SELECT 1 FROM items WHERE no = ${l.item} AND type = 'INVENTORY'`)
      if (st) await addMove(tx, { item: l.item, date: o.date, docType: 'RI', docNumber: number, description: o.description, quantity: l.qty, value: 0 })
    }
    return { number }
  })
}
