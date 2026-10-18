import { sql } from 'drizzle-orm'
import { customerInput, itemInput, salesInvoiceInput, salesReceiptInput, type SalesInvoiceInput, type SalesReceiptInput } from '@northline/schemas/sales'
import type { z } from 'zod'
import type { Db, Tx } from '../db'
import { DomainError } from '../ledger/deciders'
import { handleTx } from '../ledger/handler'
import { addMove, fifoCost, layers, loadMoves } from '../inventory/fifo'

export async function upsertCustomer(db: Db, input: z.input<typeof customerInput>) {
  const c = customerInput.parse(input)
  await db.execute(sql`INSERT INTO customers (no, name, ar_account) VALUES (${c.no}, ${c.name}, ${c.arAccount})
    ON CONFLICT (no) DO UPDATE SET name = EXCLUDED.name, ar_account = EXCLUDED.ar_account`)
}
export async function upsertItem(db: Db, input: z.input<typeof itemInput>) {
  const i = itemInput.parse(input)
  if (i.type === 'INVENTORY' && (!i.inventoryAccount || !i.cogsAccount)) throw new DomainError(`Barang persediaan ${i.no} butuh akun persediaan dan HPP`)
  await db.execute(sql`INSERT INTO items (no, name, type, unit, sales_account, expense_account, inventory_account, cogs_account)
    VALUES (${i.no}, ${i.name}, ${i.type}, ${i.unit}, ${i.salesAccount}, ${i.expenseAccount ?? null}, ${i.inventoryAccount ?? null}, ${i.cogsAccount ?? null})
    ON CONFLICT (no) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, unit = EXCLUDED.unit, sales_account = EXCLUDED.sales_account,
      expense_account = COALESCE(EXCLUDED.expense_account, items.expense_account), inventory_account = COALESCE(EXCLUDED.inventory_account, items.inventory_account),
      cogs_account = COALESCE(EXCLUDED.cogs_account, items.cogs_account)`)
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
    const [cust] = await tx.execute(sql`SELECT ar_account FROM customers WHERE no = ${inv.customer}`)
    if (!cust) throw new DomainError(`Pelanggan ${inv.customer} tidak ditemukan`)
    const items = new Map((await tx.execute(sql`SELECT no, sales_account FROM items`)).map(r => [r.no as string, r.sales_account as string]))
    const stock = new Map((await tx.execute(sql`SELECT no, inventory_account, cogs_account FROM items WHERE type = 'INVENTORY'`))
      .map(r => [r.no as string, { inv: r.inventory_account as string, cogs: r.cogs_account as string }]))
    const lines = inv.lines.map((l, i) => {
      if (!items.has(l.item)) throw new DomainError(`Barang ${l.item} tidak ditemukan`)
      return { ...l, seq: i + 1, total: Math.round(l.qty * l.price) }
    })
    const total = lines.reduce((s, l) => s + l.total, 0)
    const number = inv.number ?? await nextNumber(tx, `SI.${period(inv.date)}`)
    // Stock items: FIFO cost now, booked Dr HPP / Cr Persediaan after the sales lines (Accurate's order).
    const costs: { item: string; qty: number; cost: number; cogs: string; inv: string }[] = []
    for (const l of lines) {
      const st = stock.get(l.item)
      if (!st) continue
      const prior = costs.filter(c => c.item === l.item)
      const ls = layers([...await loadMoves(tx, l.item, inv.date), ...prior.map(c => ({ date: inv.date, quantity: -c.qty, value: -c.cost }))])
      costs.push({ item: l.item, qty: l.qty, cost: fifoCost(ls, l.qty), cogs: st.cogs, inv: st.inv })
    }
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${inv.idempotencyKey}:journal`, journalId, number, sourceType: 'SI', date: inv.date, description: inv.description,
      lines: [
        { account: cust.ar_account as string, side: 'DEBIT', amount: (total / 100).toFixed(2) },
        ...merge(lines.map(l => ({ account: items.get(l.item)!, amount: l.total }))).map(c => ({ account: c.account, side: 'CREDIT' as const, amount: (c.amount / 100).toFixed(2) })),
        ...merge(costs.map(c => ({ account: c.cogs, amount: c.cost }))).filter(c => c.amount).map(c => ({ account: c.account, side: 'DEBIT' as const, amount: (c.amount / 100).toFixed(2) })),
        ...merge(costs.map(c => ({ account: c.inv, amount: c.cost }))).filter(c => c.amount).map(c => ({ account: c.account, side: 'CREDIT' as const, amount: (c.amount / 100).toFixed(2) })),
      ],
    })
    for (const c of costs) await addMove(tx, { item: c.item, date: inv.date, docType: 'SI', docNumber: number, description: inv.description, quantity: -c.qty, value: -c.cost })
    await tx.execute(sql`INSERT INTO sales_invoices (number, customer_no, date, due_date, description, total, journal_id)
      VALUES (${number}, ${inv.customer}, ${inv.date}, ${inv.dueDate ?? inv.date}, ${inv.description}, ${total}, ${journalId})`)
    for (const l of lines)
      await tx.execute(sql`INSERT INTO sales_invoice_lines (invoice_number, seq, item_no, name, quantity, unit_price, total)
        VALUES (${number}, ${l.seq}, ${l.item}, ${l.name}, ${l.qty}, ${l.price}, ${l.total})`)
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
    const amount = rc.payments.reduce((s, p) => s + p.amount, 0)
    const number = rc.number ?? await nextNumber(tx, `${rc.bank}.${period(rc.date)}`)
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${rc.idempotencyKey}:journal`, journalId, number, sourceType: 'SR', date: rc.date, description: rc.description,
      lines: [{ account: rc.bank, side: 'DEBIT', amount: (amount / 100).toFixed(2) }, ...merge(credits).map(c => ({ account: c.account, side: 'CREDIT' as const, amount: (c.amount / 100).toFixed(2) }))],
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
