import { sql } from 'drizzle-orm'
import { customerInput, itemInput, salesDownPaymentInput, salesInvoiceInput, salesReceiptInput, type SalesDownPaymentInput, type SalesInvoiceInput, type SalesReceiptInput } from '@northline/schemas/sales'
import type { z } from 'zod'
import type { Db, Tx } from '../db'
import { DomainError } from '../ledger/deciders'
import { handleTx } from '../ledger/handler'
import { addMove, costingMethod, costOut, layers, loadMoves } from '../inventory/fifo'
import { logActivity } from '../activity/log'

export async function upsertCustomer(db: Db, input: z.input<typeof customerInput>) {
  const c = customerInput.parse(input)
  await db.transaction(async tx => {
    const [row] = await tx.execute(sql`INSERT INTO customers (no, name, ar_account, tax_document_code, tax_type, credit_limit, currency, realized_gain_account, unrealized_gain_account) VALUES (${c.no}, ${c.name}, ${c.arAccount}, ${c.taxDocumentCode ?? 'DIGUNGGUNG'}, ${c.taxType ?? null}, ${c.creditLimit ?? null}, ${c.currency}, ${c.realizedGainAccount ?? null}, ${c.unrealizedGainAccount ?? null})
      ON CONFLICT (no) DO UPDATE SET name = EXCLUDED.name, ar_account = EXCLUDED.ar_account, tax_document_code = EXCLUDED.tax_document_code, tax_type = EXCLUDED.tax_type, credit_limit = EXCLUDED.credit_limit, currency = EXCLUDED.currency, realized_gain_account = EXCLUDED.realized_gain_account, unrealized_gain_account = EXCLUDED.unrealized_gain_account
      RETURNING (xmax = 0) AS inserted`)
    // Accurate saves a customer as a Kontak and a Pelanggan, both logged under the customer's name (Kontak first).
    const action = row!.inserted ? 'CREATE' : 'UPDATE'
    await logActivity(tx, { action, entity: 'CTC', reference: c.name })
    await logActivity(tx, { action, entity: 'CST', reference: c.name })
  })
}

export async function upsertItem(db: Db, input: z.input<typeof itemInput>) {
  const i = itemInput.parse(input)
  if (i.type === 'INVENTORY' && (!i.inventoryAccount || !i.cogsAccount)) throw new DomainError(`Barang persediaan ${i.no} butuh akun persediaan dan HPP`)
  await db.transaction(async tx => {
    const [row] = await tx.execute(sql`INSERT INTO items (no, name, type, unit, sales_account, expense_account, inventory_account, cogs_account, sales_return_account)
      VALUES (${i.no}, ${i.name}, ${i.type}, ${i.unit}, ${i.salesAccount}, ${i.expenseAccount ?? null}, ${i.inventoryAccount ?? null}, ${i.cogsAccount ?? null}, ${i.salesReturnAccount ?? null})
      ON CONFLICT (no) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, unit = EXCLUDED.unit, sales_account = EXCLUDED.sales_account,
        expense_account = COALESCE(EXCLUDED.expense_account, items.expense_account), inventory_account = COALESCE(EXCLUDED.inventory_account, items.inventory_account),
        cogs_account = COALESCE(EXCLUDED.cogs_account, items.cogs_account), sales_return_account = COALESCE(EXCLUDED.sales_return_account, items.sales_return_account)
      RETURNING (xmax = 0) AS inserted`)
    if (i.deliveredAccount) await tx.execute(sql`UPDATE items SET delivered_account = ${i.deliveredAccount} WHERE no = ${i.no}`)
    if (i.tax || i.salesDiscountAccount) await tx.execute(sql`UPDATE items SET tax_name = ${i.tax ?? null}, sales_discount_account = ${i.salesDiscountAccount ?? null} WHERE no = ${i.no}`)
    if (i.type === 'GROUP') {
      await tx.execute(sql`DELETE FROM item_group_components WHERE group_no = ${i.no}`)
      for (const [n, c] of i.components.entries()) await tx.execute(sql`INSERT INTO item_group_components VALUES (${i.no}, ${n + 1}, ${c.item}, ${c.qty})`)
    }
    await logActivity(tx, { action: row!.inserted ? 'CREATE' : 'UPDATE', entity: 'ITM', reference: i.name })
  })
}

/** Deletes a customer or item no document uses, logged under its name (a customer: Pelanggan, then Kontak — Accurate's order). */
export async function deleteMaster(db: Db, kind: 'customer' | 'item', no: string) {
  const table = kind === 'customer' ? 'customers' : 'items'
  await db.transaction(async tx => {
    const [row] = await tx.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE no = ${no} RETURNING name`).catch(e => {
      throw (e?.cause ?? e)?.code === '23503' ? new DomainError(`${no} sudah dipakai transaksi lain`) : e
    })
    if (!row) throw new DomainError(`${no} tidak ditemukan`)
    const reference = row.name as string
    for (const entity of kind === 'customer' ? (['CST', 'CTC'] as const) : (['ITM'] as const)) await logActivity(tx, { action: 'DELETE', entity, reference })
  })
}

export async function nextNumber(tx: Tx, prefix: string) {
  const [r] = await tx.execute(sql`INSERT INTO number_sequences (prefix, last) VALUES (${prefix}, 1)
    ON CONFLICT (prefix) DO UPDATE SET last = number_sequences.last + 1 RETURNING last`)
  return prefix + String(r!.last).padStart(5, '0')
}
export const period = (date: string) => `${date.slice(0, 4)}.${date.slice(5, 7)}.`
/** Credit/debit lines merged per account, in order of first appearance (Accurate prints one line per account). */
/** PPh withheld on a receipt/payment line (P3.5): amount = DPP × rate, rounded to the rupiah; posts to the tax's sales (receipts) or purchase (payments) account. */
export async function withheldPph(tx: Tx, p: { invoice: string; amount: number; pph?: { tax: string; number: string; dpp: number; rate: number } }, side: 'sales' | 'purchase') {
  if (!p.pph) return null
  const [t] = await tx.execute(sql`SELECT pph_type, sales_account, purchase_account FROM taxes WHERE name = ${p.pph.tax}`)
  if (!t?.pph_type) throw new DomainError(`${p.pph.tax} bukan pajak PPh`)
  const account = (side === 'sales' ? t.sales_account : t.purchase_account) as string | null
  if (!account) throw new DomainError(`Pajak ${p.pph.tax} belum punya akun pajak ${side === 'sales' ? 'penjualan' : 'pembelian'}`)
  const amount = Math.round(p.pph.dpp * p.pph.rate / 100 / 100) * 100
  if (amount >= p.amount) throw new DomainError(`PPh ${p.invoice} melebihi pembayaran`)
  return { ...p.pph, account, amount }
}

export function merge(lines: { account: string; amount: number }[]) {
  const m = new Map<string, number>()
  for (const l of lines) m.set(l.account, (m.get(l.account) ?? 0) + l.amount)
  return [...m].map(([account, amount]) => ({ account, amount }))
}

/** `db` may be a transaction (edits re-create the invoice inside theirs); `action` is what Log Aktifitas records. */
export async function createSalesInvoice(db: Db | Tx, input: SalesInvoiceInput, action: 'CREATE' | 'UPDATE' = 'CREATE') {
  const parsed = salesInvoiceInput.parse(input)
  // Foreign invoice: everything below works in IDR (price x rate); the rate is kept for receipts (ADR-0012).
  const inv = { ...parsed, lines: parsed.lines.map(l => ({ ...l, price: Math.round(l.price * parsed.rate) })) }
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
    const known = new Set((await tx.execute(sql`SELECT no FROM salesmen`)).map(r => r.no as string))
    const lines = inv.lines.map((l, i) => {
      for (const s of l.salesmen) if (!known.has(s)) throw new DomainError(`Tenaga Penjual ${s} tidak ditemukan`)
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
    const costs: { item: string; qty: number; cost: number; exact?: number; cogs: string; inv: string; delivered?: boolean }[] = []
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
      const ls = layers([...await loadMoves(tx, l.item, inv.date), ...prior.map(c => ({ date: inv.date, quantity: -c.qty, value: -(c.exact ?? c.cost) }))], await costingMethod(tx))
      const exact = costOut(ls, l.qty, await costingMethod(tx))
      costs.push({ item: l.item, qty: l.qty, cost: Math.round(exact), exact, cogs: st.cogs, inv: st.inv })
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
    for (const c of costs.filter(c => !c.delivered)) await addMove(tx, { item: c.item, date: inv.date, docType: 'SI', docNumber: number, description: inv.description, quantity: -c.qty, value: -(c.exact ?? c.cost) })
    await tx.execute(sql`INSERT INTO sales_invoices (number, customer_no, date, due_date, description, total, journal_id, discount, tax_date)
      VALUES (${number}, ${inv.customer}, ${inv.date}, ${inv.dueDate ?? inv.date}, ${inv.description}, ${total}, ${journalId}, ${discount}, ${inv.taxable ? inv.date : null})`)
    if (inv.installments.length && inv.installments.reduce((s, i) => s + i.amount, 0) !== total) throw new DomainError('Jumlah cicilan harus sama dengan total faktur')
    for (const [i, c] of inv.installments.entries())
      await tx.execute(sql`INSERT INTO sales_invoice_installments (invoice_number, seq, name, due_date, amount) VALUES (${number}, ${i + 1}, ${c.name}, ${c.date}, ${c.amount})`)
    if (inv.taxable) await tx.execute(sql`UPDATE sales_invoices SET tax_number = ${inv.taxNumber ?? null}, document_code = ${cust.tax_document_code as string}, tax_type = ${cust.tax_type as string | null} WHERE number = ${number}`)
    for (const t of taxes.values())
      await tx.execute(sql`INSERT INTO sales_invoice_taxes (invoice_number, tax_name, rate, dpp, amount) VALUES (${number}, ${t.name}, ${t.rate}, ${t.dpp}, ${t.amount})`)
    if (inv.rate !== 1) await tx.execute(sql`UPDATE sales_invoices SET rate = ${inv.rate} WHERE number = ${number}`)
    if (inv.delivery) await tx.execute(sql`UPDATE sales_invoices SET delivery_number = ${inv.delivery} WHERE number = ${number}`)
    for (const l of lines)
      await tx.execute(sql`INSERT INTO sales_invoice_lines (invoice_number, seq, item_no, name, quantity, unit_price, total, disc_pct, salesmen, order_number, order_seq)
        VALUES (${number}, ${l.seq}, ${l.item}, ${l.name}, ${l.qty}, ${l.price}, ${l.total}, ${l.discPct}, ${sql`ARRAY[${sql.join(l.salesmen.map(s => sql`${s}`), sql`, `)}]::text[]`}, ${l.order?.number ?? null}, ${l.order?.seq ?? null})`)
    for (const d of dps) await tx.execute(sql`INSERT INTO sales_dp_usages (invoice_number, dp_number, amount) VALUES (${number}, ${d.dp}, ${d.amount})`)
    await logActivity(tx, { action, entity: 'SI', reference: number, docDate: inv.date })
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${inv.idempotencyKey}, 'CreateSalesInvoice', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

/** Takes back everything an invoice wrote (lines, taxes, installments, DP usages, stock moves, journal); refused once another document uses it. */
async function removeSalesInvoice(tx: Tx, number: string, idempotencyKey: string) {
  const [si] = await tx.execute(sql`SELECT journal_id, to_char(date, 'YYYY-MM-DD') AS date, spt_masa_id FROM sales_invoices WHERE number = ${number} AND kind = 'SI' FOR UPDATE`)
  if (!si) throw new DomainError(`Faktur ${number} tidak ditemukan`)
  if (si.spt_masa_id) throw new DomainError(`Faktur ${number} sudah masuk SPT Masa`)
  for (const t of ['sales_invoice_lines', 'sales_invoice_taxes', 'sales_invoice_installments', 'sales_dp_usages'])
    await tx.execute(sql`DELETE FROM ${sql.identifier(t)} WHERE invoice_number = ${number}`)
  await tx.execute(sql`DELETE FROM stock_moves WHERE doc_type = 'SI' AND doc_number = ${number}`)
  // receipts, returns and exchange invoices reference the invoice by foreign key
  await tx.execute(sql`DELETE FROM sales_invoices WHERE number = ${number}`).catch(e => {
    throw (e?.cause ?? e)?.code === '23503' ? new DomainError(`Faktur ${number} sudah dipakai transaksi lain`) : e
  })
  await handleTx(tx, { type: 'DeleteJournal', idempotencyKey: `${idempotencyKey}:unpost`, journalId: si.journal_id as string })
  return si.date as string
}

export async function deleteSalesInvoice(db: Db, number: string, idempotencyKey: string) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${idempotencyKey}`)
    if (done) return done.result as { number: string }
    const date = await removeSalesInvoice(tx, number, idempotencyKey)
    await logActivity(tx, { action: 'DELETE', entity: 'SI', reference: number, docDate: date })
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${idempotencyKey}, 'DeleteSalesInvoice', ${JSON.stringify({ number })}::jsonb)`)
    return { number }
  })
}

/** Accurate edits an invoice in place: the old one is taken back and the new content saved, under the new number if one is given. */
export async function editSalesInvoice(db: Db, number: string, input: SalesInvoiceInput) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${input.idempotencyKey}`)
    if (done) return done.result as { number: string }
    await removeSalesInvoice(tx, number, input.idempotencyKey)
    return createSalesInvoice(tx, { ...input, number: input.number ?? number }, 'UPDATE')
  })
}

export async function createSalesReceipt(db: Db, input: SalesReceiptInput) {
  const rc = salesReceiptInput.parse(input)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${rc.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [bank] = await tx.execute(sql`SELECT type FROM accounts WHERE no = ${rc.bank}`)
    if (bank?.type !== 'CASH_BANK') throw new DomainError(`${rc.bank} bukan akun Kas & Bank`)
    const credits: { account: string; amount: number }[] = [], fx: { invoice: string; atInvoice: number; atReceipt: number }[] = []
    const pphs = new Map<string, NonNullable<Awaited<ReturnType<typeof withheldPph>>>>()
    for (const p of rc.payments) {
      const [inv] = await tx.execute(sql`
        SELECT i.customer_no, c.ar_account, i.rate, i.total - COALESCE((SELECT SUM(amount) FROM sales_receipt_lines WHERE invoice_number = i.number), 0) AS owing
        FROM sales_invoices i JOIN customers c ON c.no = i.customer_no WHERE i.number = ${p.invoice} FOR UPDATE OF i`)
      if (!inv) throw new DomainError(`Faktur ${p.invoice} tidak ditemukan`)
      if (inv.customer_no !== rc.customer) throw new DomainError(`Faktur ${p.invoice} bukan milik pelanggan ${rc.customer}`)
      // foreign payment: the receivable leaves at the invoice rate, the bank receives at the receipt rate
      const atInvoice = Math.round(p.amount * Number(inv.rate)), atReceipt = Math.round(p.amount * rc.rate)
      if (atInvoice > Number(inv.owing)) throw new DomainError(`Pembayaran ${p.invoice} melebihi sisa piutang`)
      credits.push({ account: inv.ar_account as string, amount: atInvoice })
      fx.push({ invoice: p.invoice, atInvoice, atReceipt })
      const w = await withheldPph(tx, p, 'sales')
      if (w) pphs.set(p.invoice, w)
    }
    const pph = [...pphs.values()].reduce((s, w) => s + w.amount, 0)
    const gain = fx.reduce((s, x) => s + x.atReceipt - x.atInvoice, 0)
    const paid = fx.reduce((s, x) => s + x.atReceipt, 0) - pph, amount = rc.amount === undefined ? paid : Math.round(rc.amount * rc.rate)
    if (amount < paid) throw new DomainError('Jumlah penerimaan kurang dari total pembayaran faktur')
    const [arAcc] = await tx.execute(sql`SELECT ar_account, realized_gain_account FROM customers WHERE no = ${rc.customer}`)
    if (gain && !arAcc!.realized_gain_account) throw new DomainError(`Pelanggan ${rc.customer} belum punya akun laba/rugi terealisasi`)
    const number = rc.number ?? await nextNumber(tx, `${rc.bank}.${period(rc.date)}`)
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${rc.idempotencyKey}:journal`, journalId, number, sourceType: 'SR', date: rc.cheque?.date ?? rc.date, description: rc.description, // a cheque is journaled on its cheque date (giro mundur until then)
      lines: [{ account: rc.bank, side: 'DEBIT', amount: (amount / 100).toFixed(2) },
        // withheld PPh is a prepaid tax debit right after the bank (fixtures/pph-m50.json)
        ...merge([...pphs.values()]).map(w => ({ account: w.account, side: 'DEBIT' as const, amount: (w.amount / 100).toFixed(2) })),
        ...merge(credits).map(c => ({ account: c.account, side: 'CREDIT' as const, amount: (c.amount / 100).toFixed(2) })),
        // the excess is credited to the receivable on its own line (Accurate does not merge it with the invoice payments)
        ...(amount > paid ? [{ account: arAcc!.ar_account as string, side: 'CREDIT' as const, amount: ((amount - paid) / 100).toFixed(2) }] : []),
        // realized exchange difference last (fixtures/fx-t31.json): gain credited, loss debited
        ...(gain ? [{ account: arAcc!.realized_gain_account as string, side: (gain > 0 ? 'CREDIT' : 'DEBIT') as 'CREDIT' | 'DEBIT', amount: (Math.abs(gain) / 100).toFixed(2) }] : [])],
    })
    await tx.execute(sql`INSERT INTO sales_receipts (number, customer_no, bank_no, date, description, amount, journal_id)
      VALUES (${number}, ${rc.customer}, ${rc.bank}, ${rc.date}, ${rc.description}, ${amount}, ${journalId})`)
    if (rc.rate !== 1) await tx.execute(sql`UPDATE sales_receipts SET rate = ${rc.rate} WHERE number = ${number}`)
    if (rc.cheque) await tx.execute(sql`UPDATE sales_receipts SET payment_method = 'BANK_CHEQUE', cheque_no = ${rc.cheque.no}, cheque_date = ${rc.cheque.date} WHERE number = ${number}`)
    for (const p of rc.payments) {
      const [inst] = p.installment ? await tx.execute(sql`SELECT seq FROM sales_invoice_installments WHERE invoice_number = ${p.invoice} AND name = ${p.installment}`) : []
      if (p.installment && !inst) throw new DomainError(`Cicilan ${p.installment} tidak ada di faktur ${p.invoice}`)
      const x = fx.find(x => x.invoice === p.invoice)!
      await tx.execute(sql`INSERT INTO sales_receipt_lines (receipt_number, invoice_number, amount, installment_seq, amount_at_receipt) VALUES (${number}, ${p.invoice}, ${x.atInvoice}, ${inst?.seq ?? null}, ${x.atReceipt})`)
      const w = pphs.get(p.invoice)
      if (w) await tx.execute(sql`UPDATE sales_receipt_lines SET pph_tax = ${w.tax}, pph_number = ${w.number}, pph_dpp = ${w.dpp}, pph_rate = ${w.rate}, pph_amount = ${w.amount} WHERE receipt_number = ${number} AND invoice_number = ${p.invoice}`)
    }
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${rc.idempotencyKey}, 'CreateSalesReceipt', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

export async function createSalesDownPayment(db: Db | Tx, input: SalesDownPaymentInput) {
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

/** Takes back a down payment (row and journal); refused once an invoice uses it or a receipt pays it. */
async function removeSalesDownPayment(tx: Tx, number: string, idempotencyKey: string) {
  const [dp] = await tx.execute(sql`SELECT journal_id FROM sales_invoices WHERE number = ${number} AND kind = 'DP' FOR UPDATE`)
  if (!dp) throw new DomainError(`Uang muka ${number} tidak ditemukan`)
  const [used] = await tx.execute(sql`SELECT 1 FROM sales_dp_usages WHERE dp_number = ${number} LIMIT 1`)
  if (used) throw new DomainError(`Uang muka ${number} sudah dipakai transaksi lain`)
  await tx.execute(sql`DELETE FROM sales_invoices WHERE number = ${number}`).catch(e => {
    throw (e?.cause ?? e)?.code === '23503' ? new DomainError(`Uang muka ${number} sudah dipakai transaksi lain`) : e
  })
  await handleTx(tx, { type: 'DeleteJournal', idempotencyKey: `${idempotencyKey}:unpost`, journalId: dp.journal_id as string })
}

export async function deleteSalesDownPayment(db: Db, number: string, idempotencyKey: string) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${idempotencyKey}`)
    if (done) return done.result as { number: string }
    await removeSalesDownPayment(tx, number, idempotencyKey)
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${idempotencyKey}, 'DeleteSalesDownPayment', ${JSON.stringify({ number })}::jsonb)`)
    return { number }
  })
}

/** Edited in place, as Accurate does: taken back and saved again under the same number. */
export async function editSalesDownPayment(db: Db, number: string, input: SalesDownPaymentInput) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${input.idempotencyKey}`)
    if (done) return done.result as { number: string }
    salesDownPaymentInput.parse(input) // reject bad input before taking the old one back
    await removeSalesDownPayment(tx, number, input.idempotencyKey)
    return createSalesDownPayment(tx, { ...input, number: input.number ?? number })
  })
}

type OrderLine = { item: string; qty: number; price: number }
/** Penawaran Penjualan: no journal (ADR-0027). */
export async function createSalesQuotation(db: Db, q: { number?: string; customer: string; date: string; description?: string; lines: OrderLine[] }) {
  return db.transaction(async tx => {
    const number = q.number ?? await nextNumber(tx, `SQ.${period(q.date)}`)
    await tx.execute(sql`INSERT INTO sales_quotations VALUES (${number}, ${q.customer}, ${q.date}, ${q.description ?? ''}, ${Math.round(q.lines.reduce((s, l) => s + l.qty * l.price, 0) * 100)})`)
    for (const [i, l] of q.lines.entries()) await tx.execute(sql`INSERT INTO sales_quotation_lines VALUES (${number}, ${i + 1}, ${l.item}, ${l.qty}, ${Math.round(l.price * 100)})`)
    return { number }
  })
}

/** Pesanan Penjualan: no journal. A line may take a quotation line (Penawaran → Pesanan), which then counts as processed. */
export async function createSalesOrder(db: Db, o: { number?: string; customer: string; date: string; description?: string; lines: (OrderLine & { quotation?: { number: string; seq: number } })[] }) {
  return db.transaction(async tx => {
    const number = o.number ?? await nextNumber(tx, `SO.${period(o.date)}`)
    await tx.execute(sql`INSERT INTO sales_orders VALUES (${number}, ${o.customer}, ${o.date}, ${o.description ?? ''}, ${Math.round(o.lines.reduce((s, l) => s + l.qty * l.price, 0) * 100)})`)
    for (const [i, l] of o.lines.entries())
      await tx.execute(sql`INSERT INTO sales_order_lines (order_number, seq, item_no, quantity, unit_price, quotation_number, quotation_seq) VALUES (${number}, ${i + 1}, ${l.item}, ${l.qty}, ${Math.round(l.price * 100)}, ${l.quotation?.number ?? null}, ${l.quotation?.seq ?? null})`)
    return { number }
  })
}

/** Pengiriman Pesanan: stock leaves at FIFO cost into the delivered-goods account (Dr Persediaan Terkirim / Cr Persediaan). */
export async function createDeliveryOrder(db: Db, d: { idempotencyKey: string; number?: string; customer: string; order?: string; date: string; description?: string; lines: { item: string; qty: number }[] }) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${d.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const number = d.number ?? await nextNumber(tx, `DO.${period(d.date)}`)
    const costed: { item: string; qty: number; cost: number; exact: number; inv: string; dlv: string }[] = []
    for (const l of d.lines) {
      const [it] = await tx.execute(sql`SELECT inventory_account, delivered_account FROM items WHERE no = ${l.item} AND type = 'INVENTORY'`)
      if (!it?.delivered_account) throw new DomainError(`Barang ${l.item} belum punya akun persediaan terkirim`)
      const m = await costingMethod(tx), exact = costOut(layers(await loadMoves(tx, l.item, d.date), m), l.qty, m)
      costed.push({ item: l.item, qty: l.qty, cost: Math.round(exact), exact, inv: it.inventory_account as string, dlv: it.delivered_account as string })
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
      await addMove(tx, { item: c.item, date: d.date, docType: 'DO', docNumber: number, description: d.description ?? '', quantity: -c.qty, value: -c.exact })
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
