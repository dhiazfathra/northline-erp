import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import t19 from '../../../docs/reports/fixtures/tax-t19.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { queryGeneralLedger } from '../src/reports/queries'
import { loadSalesTaxes, salesInvoiceSpt, taxationOut, type TaxLine } from '../src/reports/tax'
import { createSalesInvoice, upsertCustomer, upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('tax')
  for (const a of t19.accounts)
    await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const [i, t] of t19.taxes.entries())
    await f.db.execute(sql`INSERT INTO taxes (name, rate, seq, sales_account) VALUES (${t.name}, ${t.rate}, ${i}, ${t.salesAccount})`)
  for (const c of t19.customers) await upsertCustomer(f.db, c)
  for (const i of t19.items) await upsertItem(f.db, i as any)
  for (const d of t19.documents)
    await createSalesInvoice(f.db, { idempotencyKey: `t19-${d.ref}`, number: d.number, customer: d.customer, date: d.date, description: d.description,
      taxable: d.taxable, discPct: d.discPct ?? 0, discountAccount: t19.invoiceDiscountAccount, lines: d.lines })
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())

const W = { from: '2035-11-01', to: '2035-11-30' }
// The sandbox demo invoices (Oct 2026) carry 628.100 PPN Keluaran that Accurate opens the report with; added as one line so the whole report diffs.
const DEMO_OPENING: TaxLine = { number: 'demo', date: '2026-10-04', taxDate: '2026-10-04', taxNumber: '', tax: 'ZZ-R01-PPN 11%', rate: 11, amount: 62_810_000 }

test('TaxationOutReport Nov 2035', async () => {
  expect(taxationOut([DEMO_OPENING, ...await loadSalesTaxes(f.db)], W.from, W.to)).toEqual(t19.reports.TaxationOutReport.rows)
})

test('SalesInvoiceSPTListReport Nov 2035: invoices without an e-Faktur number are not listed', async () => {
  expect(salesInvoiceSpt(await loadSalesTaxes(f.db), W.from, W.to)).toEqual(t19.reports.SalesInvoiceSPTListReport.rows)
})

test('AllJournalReport Nov 2035: taxed invoices post discounts, PPN Keluaran and gross sales', async () => {
  expect(await queryGeneralLedger(f.db, 'all-journals', { from: W.from, to: W.to, showZeroBalance: false, showParentAccount: true })).toEqual(t19.reports.AllJournalReport.rows.slice(2)) // title + date range are page chrome here
})
