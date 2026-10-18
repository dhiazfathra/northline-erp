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
    const [vendor] = await tx.execute(sql`SELECT ap_account, tax_document_code, tax_type FROM vendors WHERE no = ${inv.vendor}`)
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
    const taxOf = new Map((await tx.execute(sql`SELECT i.no, t.name, t.rate, t.purchase_account FROM items i JOIN taxes t ON t.name = i.tax_name`))
      .map(r => [r.no as string, { name: r.name as string, rate: Number(r.rate), account: r.purchase_account as string }]))
    const taxes = new Map<string, { name: string; rate: number; account: string; dpp: number; amount: number }>()
    if (inv.taxable) for (const l of lines) {
      const t = taxOf.get(l.item)
      if (!t) continue
      if (!t.account) throw new DomainError(`Pajak ${t.name} belum punya akun pajak pembelian`)
      const e = taxes.get(t.name) ?? { ...t, dpp: 0, amount: 0 }
      e.dpp += l.total
      taxes.set(t.name, e)
    }
    for (const t of taxes.values()) t.amount = Math.round(t.dpp * t.rate / 100 / 100) * 100
    const expenses = inv.expenses.reduce((s, e) => s + e.amount, 0)
    const total = lines.reduce((s, l) => s + l.total, 0) + expenses + [...taxes.values()].reduce((s, t) => s + t.amount, 0)
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
        ...merge(inv.expenses).map(d => ({ account: d.account, side: 'DEBIT' as const, amount: rupiah(d.amount) })),
        ...merge([...taxes.values()].filter(t => t.amount).map(t => ({ account: t.account, amount: t.amount }))).map(d => ({ account: d.account, side: 'DEBIT' as const, amount: rupiah(d.amount) })),
        ...(total - dpUsed ? [{ account: vendor.ap_account as string, side: 'CREDIT' as const, amount: rupiah(total - dpUsed) }] : []),
        ...merge(dps).map(d => ({ account: d.account, side: 'CREDIT' as const, amount: rupiah(d.amount) })),
      ],
    })
    await tx.execute(sql`INSERT INTO purchase_invoices (number, vendor_no, bill_number, date, due_date, description, total, journal_id, tax_date)
      VALUES (${number}, ${inv.vendor}, ${inv.bill}, ${inv.date}, ${inv.dueDate ?? inv.date}, ${inv.description}, ${total}, ${journalId}, ${inv.taxable ? inv.date : null})`)
    if (inv.taxable) await tx.execute(sql`UPDATE purchase_invoices SET document_code = ${vendor.tax_document_code as string}, tax_type = ${vendor.tax_type as string} WHERE number = ${number}`)
    for (const t of taxes.values())
      await tx.execute(sql`INSERT INTO purchase_invoice_taxes (invoice_number, tax_name, rate, dpp, amount) VALUES (${number}, ${t.name}, ${t.rate}, ${t.dpp}, ${t.amount})`)
    for (const l of lines) {
      if (l.serials.length && l.serials.length !== l.qty) throw new DomainError(`Jumlah nomor seri ${l.item} harus sama dengan kuantitas`)
      for (const sn of l.serials) await tx.execute(sql`INSERT INTO serial_numbers (item_no, serial, date, doc_type, doc_number, quantity, warehouse) VALUES (${l.item}, ${sn}, ${inv.date}, 'PI', ${number}, 1, ${inv.warehouse})`)
    }
    for (const [i, e] of inv.expenses.entries())
      await tx.execute(sql`INSERT INTO purchase_invoice_expenses (invoice_number, seq, account_no, name, amount) VALUES (${number}, ${i + 1}, ${e.account}, ${e.name}, ${e.amount})`)
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

// shortcut: fixed Accurate default account; read it from preferences when GRNI linking to invoices is modelled.
export const UNBILLED_ACCOUNT = '210203'

/** Penerimaan Barang: unpriced (unlinked) receipts add quantity only; priced receipts also journal to the unbilled account.
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
      if (st) await addMove(tx, { item: l.item, date: o.date, docType: 'RI', docNumber: number, description: o.description, quantity: l.qty, value: Math.round(l.qty * (l.price ?? 0) * 100) })
    }
    // Priced receipt: Dr inventory, Cr Hutang Pembelian Belum Ditagih (fixtures/unbilled-t24.json). Unpriced receipts journal nothing.
    const priced = o.lines.filter(l => l.price)
    if (priced.length) {
      const inv = new Map((await tx.execute(sql`SELECT no, inventory_account FROM items`)).map(r => [r.no as string, r.inventory_account as string]))
      const ls = merge(priced.map(l => ({ account: inv.get(l.item)!, amount: Math.round(l.qty * l.price! * 100) })))
      await handleTx(tx, {
        type: 'PostJournal', idempotencyKey: `ri:${number}:journal`, journalId: crypto.randomUUID(), number, sourceType: 'RI', date: o.date, description: o.description,
        lines: [...ls.map(d => ({ account: d.account, side: 'DEBIT' as const, amount: rupiah(d.amount) })),
          { account: UNBILLED_ACCOUNT, side: 'CREDIT' as const, amount: rupiah(ls.reduce((t, d) => t + d.amount, 0)) }],
      })
    }
    return { number }
  })
}

/** Permintaan Barang: no journal, no stock effect. */
export async function createPurchaseRequisition(db: Db, r: { number?: string; date: string; description?: string; lines: { item: string; qty: number; requiredDate?: string }[] }) {
  return db.transaction(async tx => {
    const number = r.number ?? await nextNumber(tx, `PR.${period(r.date)}`)
    await tx.execute(sql`INSERT INTO purchase_requisitions VALUES (${number}, ${r.date}, ${r.description ?? ''})`)
    for (const [i, l] of r.lines.entries()) await tx.execute(sql`INSERT INTO purchase_requisition_lines VALUES (${number}, ${i + 1}, ${l.item}, ${l.qty}, ${l.requiredDate ?? null})`)
    return { number }
  })
}

/** Lapor SPT Masa PPN: every taxable sales/purchase invoice with tax date in the period not yet reported joins a new SPT. */
export async function reportSptMasa(db: Db, from: string, to: string) {
  return db.transaction(async tx => {
    const [spt] = await tx.execute(sql`INSERT INTO spt_masa (from_date, to_date) VALUES (${from}, ${to}) RETURNING id`)
    for (const t of ['sales_invoices', 'purchase_invoices'])
      await tx.execute(sql`UPDATE ${sql.identifier(t)} SET spt_masa_id = ${spt!.id} WHERE spt_masa_id IS NULL AND tax_date BETWEEN ${from} AND ${to}`)
    return { id: Number(spt!.id) }
  })
}

/** Harga Pemasok (VPA.yyyy.mm.nnnnn): a vendor's purchase price per item from the date on; no journal. */
export async function createVendorPrice(db: Db, v: { number?: string; vendor: string; date: string; lines: { item: string; price: number }[] }) {
  return db.transaction(async tx => {
    const number = v.number ?? await nextNumber(tx, `VPA.${period(v.date)}`)
    for (const l of v.lines) await tx.execute(sql`INSERT INTO vendor_prices VALUES (${number}, ${v.vendor}, ${v.date}, ${l.item}, ${Math.round(l.price * 100)})`)
    return { number }
  })
}
