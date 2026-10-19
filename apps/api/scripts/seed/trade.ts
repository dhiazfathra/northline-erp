// Trade Portal Demo seed (ADR-0029): docs/reports/fixtures/trade only. Costing AVERAGE (ADR-0031), set before any stock move.
import { sql } from 'drizzle-orm'
import jfx from '../../../../docs/reports/fixtures/trade/journal-tp.json'
import fx from '../../../../docs/reports/fixtures/trade/trade-tp.json'
import type { Db } from '../../src/db'
import { handle } from '../../src/ledger/handler'
import { createPurchaseInvoice, upsertVendor } from '../../src/purchases/service'
import { createPurchaseReturn, createSalesReturn } from '../../src/returns/service'
import { createSalesInvoice, upsertCustomer, upsertItem } from '../../src/sales/service'

const RE = '300002'
export default async function seed(db: Db, sync: () => Promise<void>) {
  const all = new Map([...jfx.accounts, ...fx.accounts].map(a => [a.no, a]))
  const depth = (no: string | null): number => (no ? 1 + depth(all.get(no)!.parentNo) : 0)
  const open = new Set((await db.execute(sql`SELECT no FROM accounts`)).map(r => r.no as string))
  for (const a of [...all.values()].sort((x, y) => depth(x.parentNo) - depth(y.parentNo)))
    if (!open.has(a.no)) await handle(db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any, parentNo: a.parentNo ?? undefined })
  await sync()
  await db.execute(sql`INSERT INTO ledger_settings (retained_earnings_account, fiscal_year_start_month, costing_method)
    SELECT ${RE}, 1, 'AVERAGE' WHERE NOT EXISTS (SELECT 1 FROM ledger_settings)`)
  // ADR-0037: set on every run so an older branch gains the preferences
  await db.execute(sql`UPDATE ledger_settings SET aging_basis = 'INVOICE_DATE', report_style = 'RETAIL'`)
  for (const [i, t] of (fx as any).taxes.entries())
    await db.execute(sql`INSERT INTO taxes (name, rate, seq, sales_account, purchase_account) VALUES (${t.name}, ${t.rate}, ${i}, ${t.salesAccount}, ${t.purchaseAccount}) ON CONFLICT DO NOTHING`)
  for (const j of jfx.journals)
    await handle(db, { type: 'PostJournal', idempotencyKey: `nl-tp-${j.ref}`, journalId: crypto.randomUUID(), date: j.date, description: j.description,
      lines: j.lines.map(l => ({ ...l, side: l.side as 'DEBIT' | 'CREDIT' })) })
  for (const c of fx.customers) await upsertCustomer(db, c)
  for (const v of fx.vendors) await upsertVendor(db, v)
  for (const i of fx.items) await upsertItem(db, i as any)
  for (const d of fx.documents as any[]) {
    if (d.kind === 'PurchaseInvoice') await createPurchaseInvoice(db, { idempotencyKey: `tp-${d.ref}`, number: d.number, vendor: d.vendor, bill: d.bill, date: d.date, dueDate: d.dueDate, description: d.description, lines: d.lines })
    else if (d.kind === 'SalesReturn' || d.kind === 'PurchaseReturn') await (d.kind === 'SalesReturn' ? createSalesReturn : createPurchaseReturn)(db, { idempotencyKey: `tp-${d.ref}`, number: d.number, invoice: d.invoice, date: d.date, description: d.description, lines: d.lines })
    else await createSalesInvoice(db, { idempotencyKey: `tp-${d.ref}`, number: d.number, customer: d.customer, date: d.date, dueDate: d.dueDate, description: d.description, lines: d.lines })
  }
  await sync()
}
