// Retail Demo seed: the seven input fixtures in docs/reports/fixtures/retail (approval-rf, budget-rb, dimensions-ra,
// inventory-re, jobcosting-rg, quotation-rd, salesman-rc), replayed as their tests do. The *Report.json files are captured rows only.
// Conflicts: none by number. An account appearing in several fixtures is opened once (the copy that carries parentNo wins; some
// fixtures list it without a parent). No retail fixture has a retained-earnings account, so 300002 'Laba Ditahan' (the one the
// tests use) is opened here. Warehouses GD. JAKARTA / GD. SURABAYA, vendor VJKT-0009 and the Komisi Team rule recur and are upserted/skipped.
import { sql } from 'drizzle-orm'
import rf from '../../../../docs/reports/fixtures/retail/approval-rf.json'
import rb from '../../../../docs/reports/fixtures/retail/budget-rb.json'
import ra from '../../../../docs/reports/fixtures/retail/dimensions-ra.json'
import re from '../../../../docs/reports/fixtures/retail/inventory-re.json'
import rg from '../../../../docs/reports/fixtures/retail/jobcosting-rg.json'
import rd from '../../../../docs/reports/fixtures/retail/quotation-rd.json'
import rc from '../../../../docs/reports/fixtures/retail/salesman-rc.json'
import type { Db } from '../../src/db'
import { createItemTransfer, upsertWarehouse } from '../../src/inventory/adjustment'
import { createJobOrder, createRollOver } from '../../src/inventory/job-costing'
import { handle } from '../../src/ledger/handler'
import { createPurchaseInvoice, createVendorPrice, upsertVendor } from '../../src/purchases/service'
import { saveSalesTarget } from '../../src/reports/targets'
import { createSalesReturn } from '../../src/returns/service'
import { saveApprovalRule, submitForApproval } from '../../src/sales/approvals'
import { createSalesInvoice, createSalesOrder, createSalesQuotation, createSalesReceipt, upsertCustomer, upsertItem } from '../../src/sales/service'
import { saveCommission, upsertSalesman } from '../../src/sales/salesmen'

const RE = '300002'
type Acct = { no: string; name: string; type: string; parentNo?: string | null }
const cents = (s: string) => Math.round(Number(s) * 100)

export default async function seed(db: Db, sync: () => Promise<void>) {
  const merged = new Map<string, Acct>()
  for (const a of [...rb.accounts, ...ra.accounts, ...re.accounts, ...rg.accounts, ...rd.accounts, ...rc.accounts, { no: RE, name: 'Laba Ditahan', type: 'EQUITY' }] as Acct[]) {
    const p = merged.get(a.no)
    if (!p || (!p.parentNo && a.parentNo)) merged.set(a.no, a)
  }
  const depth = (no?: string | null): number => (no ? 1 + depth(merged.get(no)?.parentNo) : 0)
  // skip accounts a dev DB already opened under another idempotency key
  const open = new Set((await db.execute(sql`SELECT no FROM accounts`)).map(r => r.no as string))
  for (const a of [...merged.values()].sort((x, y) => depth(x.parentNo) - depth(y.parentNo)))
    if (!open.has(a.no)) await handle(db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any, parentNo: a.parentNo ?? undefined })
  await sync()
  await db.execute(sql`INSERT INTO ledger_settings (retained_earnings_account, fiscal_year_start_month, costing_method)
    SELECT ${RE}, 1, 'FIFO' WHERE NOT EXISTS (SELECT 1 FROM ledger_settings)`)

  // dimensions (ra) and budget departments (rb); the default branch moves to JAKARTA only when it is first created
  for (const b of ra.branches) {
    if ((await db.execute(sql`SELECT 1 FROM branches WHERE name = ${b.name}`)).length) continue
    if (b.default) await db.execute(sql`UPDATE branches SET is_default = false`)
    await db.execute(sql`INSERT INTO branches (name, is_default) VALUES (${b.name}, ${!!b.default})`)
  }
  for (const d of [...ra.departments, ...rb.departments] as { name: string; description?: string }[])
    await db.execute(sql`INSERT INTO departments (name, description) VALUES (${d.name}, ${d.description ?? ''}) ON CONFLICT DO NOTHING`)
  for (const p of ra.projects) await db.execute(sql`INSERT INTO projects (name, no) VALUES (${p.name}, ${p.no}) ON CONFLICT DO NOTHING`)
  for (const [pre, fx] of [['nl-ra', ra], ['nl-rb', rb]] as const)
    for (const j of fx.journals as any[])
      await handle(db, { type: 'PostJournal', idempotencyKey: `${pre}-${j.ref}`, journalId: crypto.randomUUID(), date: j.date, description: j.description, branch: j.branch,
        lines: j.lines.map((l: any) => ({ ...l, side: l.side as 'DEBIT' | 'CREDIT' })) })
  await sync()
  for (const b of rb.budgets) {
    const [have] = await db.execute(sql`SELECT 1 FROM budgets WHERE year = ${b.year} AND month = ${b.month} AND department IS NOT DISTINCT FROM ${b.department} AND project IS NULL`)
    if (have) continue
    const [{ id }] = (await db.execute(sql`INSERT INTO budgets (year, month, department, notes) VALUES (${b.year}, ${b.month}, ${b.department}, ${b.notes}) RETURNING id`)) as any
    for (const l of b.lines) await db.execute(sql`INSERT INTO budget_lines (budget_id, account_no, amount) VALUES (${id}, ${l.account}, ${cents(l.amount)})`)
  }

  // masters (upsert) shared by the document fixtures
  for (const v of new Map([...re.vendors, ...rg.vendors].map(v => [v.no, v])).values()) await upsertVendor(db, v)
  for (const i of [...re.items, ...rg.items, ...rd.items, ...rc.items]) await upsertItem(db, i as any)
  for (const w of re.warehouses) await upsertWarehouse(db, w)
  for (const c of [...rd.customers, ...rc.customers]) await upsertCustomer(db, c as any)
  for (const s of rc.salesmen) await upsertSalesman(db, s)
  for (const c of rc.commissions) if (!(await db.execute(sql`SELECT 1 FROM salesman_commissions WHERE name = ${c.name}`)).length) await saveCommission(db, c)
  for (const t of rc.targets) if (!(await db.execute(sql`SELECT 1 FROM sales_targets WHERE name = ${t.name}`)).length) await saveSalesTarget(db, t as any)
  const has = async (table: string, col: string, v: string) => (await db.execute(sql.raw(`SELECT 1 FROM ${table} WHERE ${col} = '${v.replace(/'/g, "''")}' LIMIT 1`))).length > 0

  // inventory-re
  for (const d of re.documents as any[]) {
    if (d.kind === 'PurchaseInvoice') await createPurchaseInvoice(db, { idempotencyKey: `re-${d.number}`, ...d })
    else if (d.kind === 'ItemTransfer') { if (!(await has('item_transfers', 'number', d.number))) await createItemTransfer(db, d) }
    else if (!(await has('vendor_prices', 'number', d.number))) await createVendorPrice(db, d)
  }
  await sync()
  // jobcosting-rg
  for (const d of rg.documents as any[]) {
    if (d.kind === 'PurchaseInvoice') await createPurchaseInvoice(db, { idempotencyKey: `rg-${d.number}`, ...d })
    else if (d.kind === 'JobOrder') await createJobOrder(db, { idempotencyKey: `rg-${d.number}`, ...d })
    else await createRollOver(db, { idempotencyKey: `rg-${d.number}`, ...d })
  }
  await sync()
  // quotation-rd
  for (const q of rd.quotations) if (!(await has('sales_quotations', 'number', q.number))) await createSalesQuotation(db, q as any)
  for (const o of rd.orders) if (!(await has('sales_orders', 'number', o.number))) await createSalesOrder(db, o as any)
  for (const x of rd.invoices) await createSalesInvoice(db, { idempotencyKey: `quotation-rd-${x.number}`, ...x } as any)
  await sync()
  // salesman-rc
  for (const x of rc.documents as any[]) {
    const key = `salesman-rc-${x.ref}`
    if (x.kind === 'SalesInvoice') await createSalesInvoice(db, { idempotencyKey: key, number: x.number, customer: x.customer, date: x.date, dueDate: x.dueDate, description: x.description, lines: x.lines, rate: x.rate ?? 1 })
    else if (x.kind === 'SalesReturn') await createSalesReturn(db, { idempotencyKey: key, number: x.number, invoice: x.invoice, date: x.date, description: x.description, lines: x.lines })
    else await createSalesReceipt(db, { idempotencyKey: key, number: x.number, customer: x.customer, bank: x.bank, date: x.date, description: x.description, payments: x.payments })
  }
  await sync()
  // approval-rf: the rule and each document's approval are plain inserts, so guard them
  if (!(await db.execute(sql`SELECT 1 FROM approval_rules WHERE transaction_type = ${rf.rule.transactionType} AND min_amount = ${Math.round(rf.rule.minAmount * 100)}`)).length)
    await saveApprovalRule(db, rf.rule as any)
  for (const d of rf.documents)
    if (!(await db.execute(sql`SELECT 1 FROM document_approvals WHERE transaction_type = 'SO' AND number = ${d.number}`)).length)
      await submitForApproval(db, { transactionType: 'SO', number: d.number, date: d.date, amount: d.amount, requestedBy: d.requestedBy })
  await sync()
}
