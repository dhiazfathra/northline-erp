import { sql } from 'drizzle-orm'
import { customerInput, itemInput, salesDownPaymentInput, salesInvoiceInput, salesReceiptInput, type SalesDownPaymentInput, type SalesInvoiceInput, type SalesReceiptInput } from '@northline/schemas/sales'
import type { z } from 'zod'
import type { Db, Tx } from '../db'
import { DomainError } from '../ledger/deciders'
import { handleTx } from '../ledger/handler'
import { addMove, fifoCost, layers, loadMoves } from '../inventory/fifo'

export async function upsertCustomer(db: Db, input: z.input<typeof customerInput>) {
  const c = customerInput.parse(input)
  await db.execute(sql`INSERT INTO customers (no, name, ar_account, tax_document_code, tax_type, credit_limit) VALUES (${c.no}, ${c.name}, ${c.arAccount}, ${c.taxDocumentCode ?? 'DIGUNGGUNG'}, ${c.taxType ?? null}, ${c.creditLimit ?? null})
    ON CONFLICT (no) DO UPDATE SET name = EXCLUDED.name, ar_account = EXCLUDED.ar_account, tax_document_code = EXCLUDED.tax_document_code, tax_type = EXCLUDED.tax_type, credit_limit = EXCLUDED.credit_limit`)
}
export async function upsertItem(db: Db, input: z.input<typeof itemInput>) {
  const i = itemInput.parse(input)
  if (i.type === 'INVENTORY' && (!i.inventoryAccount || !i.cogsAccount)) throw new DomainError(`Barang persediaan ${i.no} butuh akun persediaan dan HPP`)
  await db.execute(sql`INSERT INTO items (no, name, type, unit, sales_account, expense_account, inventory_account, cogs_account, sales_return_account)
    VALUES (${i.no}, ${i.name}, ${i.type}, ${i.unit}, ${i.salesAccount}, ${i.expenseAccount ?? null}, ${i.inventoryAccount ?? null}, ${i.cogsAccount ?? null}, ${i.salesReturnAccount ?? null})
    ON CONFLICT (no) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, unit = EXCLUDED.unit, sales_account = EXCLUDED.sales_account,
      expense_account = COALESCE(EXCLUDED.expense_account, items.expense_account), inventory_account = COALESCE(EXCLUDED.inventory_account, items.inventory_account),
      cogs_account = COALESCE(EXCLUDED.cogs_account, items.cogs_account), sales_return_account = COALESCE(EXCLUDED.sales_return_account, items.sales_return_account)`)
  if (i.deliveredAccount) await db.execute(sql`UPDATE items SET delivered_account = ${i.deliveredAccount} WHERE no = ${i.no}`)
  if (i.tax || i.salesDiscountAccount) await db.execute(sql`UPDATE items SET tax_name = ${i.tax ?? null}, sales_discount_account = ${i.salesDiscountAccount ?? null} WHERE no = ${i.no}`)
}

export async function nextNumber(tx: Tx, prefix: string) {
  const [r] = await tx.execute(sql`INSERT INTO number_sequences (prefix, last) VALUES (${prefix}, 1)
    ON CONFLICT (prefix) DO UPDATE SET last = number_sequences.last + 1 RETURNING last`)
  return prefix + String(r!.last).padStart(5, '0')
}
export const period = (date: string) => `${date.slice(0, 4)}.${date.slice(5, 7)}.`
/** Credit/debit lines merged per account, in order of first appearance (Accurate prints one line per account). */
export function merge(lines: { account: string; amount: number }[]) {
  const m = new Map<string, number>()
  for (const l of lines) m.set(l.account, (m.get(l.account) ?? 0) + l.amount)
  return [...m].map(([account, amount]) => ({ account, amount }))
}

export async function createSalesInvoice(db: Db, input: SalesInvoiceInput) {
  const inv = salesInvoiceInput.parse(input)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${inv.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [cust] = await tx.execute(sql`SELECT ar_account, tax_document_code, tax_type FROM customers WHERE no = ${inv.customer}`)
    if (!cust) throw new DomainError(`Pelanggan ${inv.customer} tidak ditemukan`)
    const items = new Map((await tx.execute(sql`SELECT no, sales_account FROM items`)).map(r => [r.no as string, r.sales_account as string]))
    const itemTax = new Map((await tx.execute(sql`SELECT i.no, i.sales_discount_account, t.name, t.rate, t.sales_account FROM items i LEFT JOIN taxes t ON t.name = i.tax_name`))
      .map(r => [r.no as string, { discAccount: r.sales_discount_account as string | null, tax: r.name ? { name: r.name as string, rate: Number(r.rate), account: r.sales_account as string } : null }]))
    const stock = new Map((await tx.execute(sql`SELECT no, inventory_account, cogs_account FROM items WHERE type = 'INVENTORY'`))
      .map(r => [r.no as string, { inv: r.inventory_account as string, cogs: r.cogs_account as string }]))
    const lines = inv.lines.map((l, i) => {
      if (!items.has(l.item)) throw new DomainError(`Barang ${l.item} tidak ditemukan`)
      const gross = Math.round(l.qty * l.price), disc = Math.round(gross * l.discPct / 100)
      if (disc && !itemTax.get(l.item)!.discAccount) throw new DomainError(`Barang ${l.item} tidak punya akun diskon penjualan`)
      return { ...l, seq: i + 1, gross, disc, total: gross - disc }
    })
    const subTotal = lines.reduce((s, l) => s + l.total, 0)
    const discount = Math.round(subTotal * inv.discPct / 100)
    if (discount && !inv.discountAccount) throw new DomainError('Diskon faktur butuh akun diskon')
    // DPP per tax = its lines' totals less their share of the invoice discount; PPN rounds half-up to the rupiah (70.537,5 -> 70.538).
    // shortcut: discount share is pro-rata per tax without per-line remainder handling; verify against a multi-line, multi-tax Accurate invoice before relying on it.
    const taxes = new Map<string, { name: string; rate: number; account: string; dpp: number; amount: number }>()
    if (inv.taxable) for (const l of lines) {
      const t = itemTax.get(l.item)!.tax
      if (!t) continue
      const e = taxes.get(t.name) ?? { ...t, dpp: 0, amount: 0 }
      e.dpp += l.total
      taxes.set(t.name, e)
    }
    for (const t of taxes.values()) {
      t.dpp -= subTotal ? Math.round(discount * t.dpp / subTotal) : 0
      t.amount = Math.round(t.dpp * t.rate / 100 / 100) * 100
    }
    const taxTotal = [...taxes.values()].reduce((s, t) => s + t.amount, 0)
    const total = subTotal - discount + taxTotal
    const number = inv.number ?? await nextNumber(tx, `SI.${period(inv.date)}`)
    // Stock items: FIFO cost now, booked Dr HPP / Cr Persediaan after the sales lines (Accurate's order).
    const costs: { item: string; qty: number; cost: number; cogs: string; inv: string; delivered?: boolean }[] = []
    for (const l of lines) {
      const st = stock.get(l.item)
      if (!st) continue
      if (inv.delivery) {
        const [dl] = await tx.execute(sql`SELECT d.cost, d.quantity, i.delivered_account FROM delivery_order_lines d JOIN items i ON i.no = d.item_no WHERE d.delivery_number = ${inv.delivery} AND d.item_no = ${l.item}`)
        if (!dl) throw new DomainError(`Barang ${l.item} tidak ada di pengiriman ${inv.delivery}`)
        costs.push({ item: l.item, qty: l.qty, cost: Math.round(Number(dl.cost) * l.qty / Number(dl.quantity)), cogs: st.cogs, inv: dl.delivered_account as string, delivered: true })
        continue
      }
      const prior = costs.filter(c => c.item === l.item)
      const ls = layers([...await loadMoves(tx, l.item, inv.date), ...prior.map(c => ({ date: inv.date, quantity: -c.qty, value: -c.cost }))])
      costs.push({ item: l.item, qty: l.qty, cost: fifoCost(ls, l.qty), cogs: st.cogs, inv: st.inv })
    }
    // Down payments used: the receivable is debited net, the DP liability for the amount used (Accurate's line order).
    const dps: { dp: string; amount: number; account: string }[] = []
    for (const u of inv.downPayments) {
      const [dp] = await tx.execute(sql`SELECT i.customer_no, i.dp_account, i.total - COALESCE((SELECT SUM(amount) FROM sales_dp_usages WHERE dp_number = i.number), 0) AS left
        FROM sales_invoices i WHERE i.number = ${u.invoice} AND i.kind = 'DP' FOR UPDATE`)
      if (!dp || dp.customer_no !== inv.customer) throw new DomainError(`Uang muka ${u.invoice} tidak ditemukan untuk pelanggan ini`)
      if (u.amount > Number(dp.left)) throw new DomainError(`Uang muka ${u.invoice} tidak cukup`)
      dps.push({ dp: u.invoice, amount: u.amount, account: dp.dp_account as string })
    }
    const dpUsed = dps.reduce((s, d) => s + d.amount, 0)
    if (dpUsed > total) throw new DomainError('Uang muka melebihi total faktur')
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${inv.idempotencyKey}:journal`, journalId, number, sourceType: 'SI', date: inv.date, description: inv.description,
      lines: [
        ...(total - dpUsed ? [{ account: cust.ar_account as string, side: 'DEBIT' as const, amount: ((total - dpUsed) / 100).toFixed(2) }] : []),
        ...merge(dps).map(d => ({ account: d.account, side: 'DEBIT' as const, amount: (d.amount / 100).toFixed(2) })),
        // Accurate's order: invoice discount, line discounts, taxes, then sales at gross.
        ...(discount ? [{ account: inv.discountAccount!, side: 'DEBIT' as const, amount: (discount / 100).toFixed(2) }] : []),
        ...merge(lines.filter(l => l.disc).map(l => ({ account: itemTax.get(l.item)!.discAccount!, amount: l.disc }))).map(c => ({ account: c.account, side: 'DEBIT' as const, amount: (c.amount / 100).toFixed(2) })),
        ...merge([...taxes.values()].filter(t => t.amount).map(t => ({ account: t.account, amount: t.amount }))).map(c => ({ account: c.account, side: 'CREDIT' as const, amount: (c.amount / 100).toFixed(2) })),
        ...merge(lines.map(l => ({ account: items.get(l.item)!, amount: l.gross }))).map(c => ({ account: c.account, side: 'CREDIT' as const, amount: (c.amount / 100).toFixed(2) })),
        ...merge(costs.map(c => ({ account: c.cogs, amount: c.cost }))).filter(c => c.amount).map(c => ({ account: c.account, side: 'DEBIT' as const, amount: (c.amount / 100).toFixed(2) })),
        ...merge(costs.map(c => ({ account: c.inv, amount: c.cost }))).filter(c => c.amount).map(c => ({ account: c.account, side: 'CREDIT' as const, amount: (c.amount / 100).toFixed(2) })),
      ],
    })
    for (const c of costs.filter(c => !c.delivered)) await addMove(tx, { item: c.item, date: inv.date, docType: 'SI', docNumber: number, description: inv.description, quantity: -c.qty, value: -c.cost })
    await tx.execute(sql`INSERT INTO sales_invoices (number, customer_no, date, due_date, description, total, journal_id, discount, tax_date)
      VALUES (${number}, ${inv.customer}, ${inv.date}, ${inv.dueDate ?? inv.date}, ${inv.description}, ${total}, ${journalId}, ${discount}, ${inv.taxable ? inv.date : null})`)
    if (inv.taxable) await tx.execute(sql`UPDATE sales_invoices SET tax_number = ${inv.taxNumber ?? null}, document_code = ${cust.tax_document_code as string}, tax_type = ${cust.tax_type as string | null} WHERE number = ${number}`)
    for (const t of taxes.values())
      await tx.execute(sql`INSERT INTO sales_invoice_taxes (invoice_number, tax_name, rate, dpp, amount) VALUES (${number}, ${t.name}, ${t.rate}, ${t.dpp}, ${t.amount})`)
    if (inv.delivery) await tx.execute(sql`UPDATE sales_invoices SET delivery_number = ${inv.delivery} WHERE number = ${number}`)
    for (const l of lines)
      await tx.execute(sql`INSERT INTO sales_invoice_lines (invoice_number, seq, item_no, name, quantity, unit_price, total, disc_pct)
        VALUES (${number}, ${l.seq}, ${l.item}, ${l.name}, ${l.qty}, ${l.price}, ${l.total}, ${l.discPct})`)
    for (const d of dps) await tx.execute(sql`INSERT INTO sales_dp_usages (invoice_number, dp_number, amount) VALUES (${number}, ${d.dp}, ${d.amount})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${inv.idempotencyKey}, 'CreateSalesInvoice', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

export async function createSalesReceipt(db: Db, input: SalesReceiptInput) {
  const rc = salesReceiptInput.parse(input)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${rc.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [bank] = await tx.execute(sql`SELECT type FROM accounts WHERE no = ${rc.bank}`)
    if (bank?.type !== 'CASH_BANK') throw new DomainError(`${rc.bank} bukan akun Kas & Bank`)
    const credits: { account: string; amount: number }[] = []
    for (const p of rc.payments) {
      const [inv] = await tx.execute(sql`
        SELECT i.customer_no, c.ar_account, i.total - COALESCE((SELECT SUM(amount) FROM sales_receipt_lines WHERE invoice_number = i.number), 0) AS owing
        FROM sales_invoices i JOIN customers c ON c.no = i.customer_no WHERE i.number = ${p.invoice} FOR UPDATE OF i`)
      if (!inv) throw new DomainError(`Faktur ${p.invoice} tidak ditemukan`)
      if (inv.customer_no !== rc.customer) throw new DomainError(`Faktur ${p.invoice} bukan milik pelanggan ${rc.customer}`)
      if (p.amount > Number(inv.owing)) throw new DomainError(`Pembayaran ${p.invoice} melebihi sisa piutang`)
      credits.push({ account: inv.ar_account as string, amount: p.amount })
    }
    const paid = rc.payments.reduce((s, p) => s + p.amount, 0), amount = rc.amount ?? paid
    if (amount < paid) throw new DomainError('Jumlah penerimaan kurang dari total pembayaran faktur')
    const [arAcc] = await tx.execute(sql`SELECT ar_account FROM customers WHERE no = ${rc.customer}`)
    const number = rc.number ?? await nextNumber(tx, `${rc.bank}.${period(rc.date)}`)
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${rc.idempotencyKey}:journal`, journalId, number, sourceType: 'SR', date: rc.date, description: rc.description,
      lines: [{ account: rc.bank, side: 'DEBIT', amount: (amount / 100).toFixed(2) }, ...merge(credits).map(c => ({ account: c.account, side: 'CREDIT' as const, amount: (c.amount / 100).toFixed(2) })),
        // the excess is credited to the receivable on its own line (Accurate does not merge it with the invoice payments)
        ...(amount > paid ? [{ account: arAcc!.ar_account as string, side: 'CREDIT' as const, amount: ((amount - paid) / 100).toFixed(2) }] : [])],
    })
    await tx.execute(sql`INSERT INTO sales_receipts (number, customer_no, bank_no, date, description, amount, journal_id)
      VALUES (${number}, ${rc.customer}, ${rc.bank}, ${rc.date}, ${rc.description}, ${amount}, ${journalId})`)
    for (const p of rc.payments)
      await tx.execute(sql`INSERT INTO sales_receipt_lines (receipt_number, invoice_number, amount) VALUES (${number}, ${p.invoice}, ${p.amount})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${rc.idempotencyKey}, 'CreateSalesReceipt', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

export async function createSalesDownPayment(db: Db, input: SalesDownPaymentInput) {
  const dp = salesDownPaymentInput.parse(input)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${dp.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [cust] = await tx.execute(sql`SELECT ar_account FROM customers WHERE no = ${dp.customer}`)
    if (!cust) throw new DomainError(`Pelanggan ${dp.customer} tidak ditemukan`)
    const number = dp.number ?? await nextNumber(tx, `SI.${period(dp.date)}`)
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${dp.idempotencyKey}:journal`, journalId, number, sourceType: 'SDP', date: dp.date, description: dp.description,
      lines: [{ account: cust.ar_account as string, side: 'DEBIT', amount: (dp.amount / 100).toFixed(2) }, { account: dp.dpAccount, side: 'CREDIT', amount: (dp.amount / 100).toFixed(2) }],
    })
    await tx.execute(sql`INSERT INTO sales_invoices (number, customer_no, date, due_date, description, total, journal_id, kind, dp_account)
      VALUES (${number}, ${dp.customer}, ${dp.date}, ${dp.date}, ${dp.description}, ${dp.amount}, ${journalId}, 'DP', ${dp.dpAccount})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${dp.idempotencyKey}, 'CreateSalesDownPayment', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

/** Pesanan Penjualan: no journal. */
export async function createSalesOrder(db: Db, o: { number?: string; customer: string; date: string; description?: string; lines: { item: string; qty: number; price: number }[] }) {
  return db.transaction(async tx => {
    const number = o.number ?? await nextNumber(tx, `SO.${period(o.date)}`)
    await tx.execute(sql`INSERT INTO sales_orders VALUES (${number}, ${o.customer}, ${o.date}, ${o.description ?? ''}, ${Math.round(o.lines.reduce((s, l) => s + l.qty * l.price, 0) * 100)})`)
    for (const [i, l] of o.lines.entries()) await tx.execute(sql`INSERT INTO sales_order_lines VALUES (${number}, ${i + 1}, ${l.item}, ${l.qty}, ${Math.round(l.price * 100)})`)
    return { number }
  })
}

/** Pengiriman Pesanan: stock leaves at FIFO cost into the delivered-goods account (Dr Persediaan Terkirim / Cr Persediaan). */
export async function createDeliveryOrder(db: Db, d: { idempotencyKey: string; number?: string; customer: string; order?: string; date: string; description?: string; lines: { item: string; qty: number }[] }) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${d.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const number = d.number ?? await nextNumber(tx, `DO.${period(d.date)}`)
    const costed: { item: string; qty: number; cost: number; inv: string; dlv: string }[] = []
    for (const l of d.lines) {
      const [it] = await tx.execute(sql`SELECT inventory_account, delivered_account FROM items WHERE no = ${l.item} AND type = 'INVENTORY'`)
      if (!it?.delivered_account) throw new DomainError(`Barang ${l.item} belum punya akun persediaan terkirim`)
      costed.push({ item: l.item, qty: l.qty, cost: fifoCost(layers(await loadMoves(tx, l.item, d.date)), l.qty), inv: it.inventory_account as string, dlv: it.delivered_account as string })
    }
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${d.idempotencyKey}:journal`, journalId, number, sourceType: 'DO', date: d.date, description: d.description ?? '',
      lines: [...merge(costed.map(c => ({ account: c.dlv, amount: c.cost }))).map(l => ({ account: l.account, side: 'DEBIT' as const, amount: (l.amount / 100).toFixed(2) })),
        ...merge(costed.map(c => ({ account: c.inv, amount: c.cost }))).map(l => ({ account: l.account, side: 'CREDIT' as const, amount: (l.amount / 100).toFixed(2) }))],
    })
    await tx.execute(sql`INSERT INTO delivery_orders VALUES (${number}, ${d.customer}, ${d.order ?? null}, ${d.date}, ${d.description ?? ''}, ${journalId})`)
    for (const [i, c] of costed.entries()) {
      await tx.execute(sql`INSERT INTO delivery_order_lines VALUES (${number}, ${i + 1}, ${c.item}, ${c.qty}, ${c.cost})`)
      await addMove(tx, { item: c.item, date: d.date, docType: 'DO', docNumber: number, description: d.description ?? '', quantity: -c.qty, value: -c.cost })
    }
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${d.idempotencyKey}, 'CreateDeliveryOrder', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

/** Tukar Faktur: bundles invoices for collection; no journal. */
export async function createExchangeInvoice(db: Db, x: { number?: string; date: string; collectDate: string; dueDate: string; description?: string; invoices: string[] }) {
  return db.transaction(async tx => {
    const number = x.number ?? await nextNumber(tx, `EXI.${period(x.date)}`)
    await tx.execute(sql`INSERT INTO exchange_invoices VALUES (${number}, ${x.date}, ${x.collectDate}, ${x.dueDate}, ${x.description ?? ''})`)
    for (const i of x.invoices) await tx.execute(sql`INSERT INTO exchange_invoice_lines VALUES (${number}, ${i})`)
    return { number }
  })
}
