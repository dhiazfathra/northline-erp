import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import t19 from '../../../docs/reports/fixtures/tax-t19.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseInvoice, upsertVendor } from '../src/purchases/service'
import { queryGeneralLedger } from '../src/reports/queries'
import * as T from '../src/reports/tax'
import { createSalesInvoice, upsertCustomer, upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('tax')
  for (const a of t19.accounts)
    await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const [i, t] of t19.taxes.entries())
    await f.db.execute(sql`INSERT INTO taxes (name, rate, seq, sales_account, purchase_account) VALUES (${t.name}, ${t.rate}, ${i}, ${t.salesAccount}, ${t.purchaseAccount})`)
  for (const c of t19.customers) await upsertCustomer(f.db, c)
  for (const v of t19.vendors) await upsertVendor(f.db, v)
  for (const i of t19.items) await upsertItem(f.db, i as any)
  for (const d of t19.documents as any[])
    if (d.kind === 'SalesInvoice')
      await createSalesInvoice(f.db, { idempotencyKey: `t19-${d.ref}`, number: d.number, customer: d.customer, date: d.date, description: d.description,
        taxable: d.taxable, discPct: d.discPct ?? 0, discountAccount: t19.invoiceDiscountAccount, lines: d.lines })
    else await createPurchaseInvoice(f.db, { idempotencyKey: `t19-${d.ref}`, number: d.number, vendor: d.vendor, bill: d.bill, date: d.date, description: d.description, taxable: d.taxable, lines: d.lines })
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())

const W = { from: '2035-11-01', to: '2035-11-30' }
// The sandbox demo invoices (Oct 2026) carry PPN Keluaran 628.100 and PPN Masukan 220.000 that Accurate opens with;
// added as one line per side so whole reports diff.
const DEMO: T.TaxLine[] = [
  { side: 'OUT', number: 'demo', date: '2026-10-04', taxDate: '2026-10-04', taxNumber: '', tax: 'ZZ-R01-PPN 11%', rate: 11, amount: 62_810_000 },
  { side: 'IN', number: 'demo', date: '2026-10-04', taxDate: '2026-10-04', taxNumber: '', tax: 'ZZ-R01-PPN 11%', rate: 11, amount: 22_000_000 },
]
const R = t19.reports
const lines = async () => [...DEMO, ...await T.loadTaxLines(f.db)]

test('TaxationOutReport Nov 2035', async () => expect(T.taxationOut(await lines(), W.from, W.to)).toEqual(R.TaxationOutReport.rows))
test('TaxationInReport Nov 2035', async () => expect(T.taxationIn(await lines(), W.from, W.to)).toEqual(R.TaxationInReport.rows))
test('TaxationInOutReport Nov 2035: Keluaran − Masukan', async () => expect(T.taxationInOut(await lines(), W.from, W.to)).toEqual(R.TaxationInOutReport.rows))
test('SPT Masa PPN lists Nov 2035: invoices without an e-Faktur number are not listed', async () => {
  expect(T.salesInvoiceSpt(await lines(), W.from, W.to)).toEqual(R.SalesInvoiceSPTListReport.rows)
  expect(T.purchaseInvoiceSpt(await lines(), W.from, W.to)).toEqual(R.PurchaseInvoiceSPTListReport.rows)
})
test('AllJournalReport Nov 2035: taxed invoices post discounts, PPN and gross sales/expense', async () => {
  // title + date range are page chrome in the GL query's output
  expect(await queryGeneralLedger(f.db, 'all-journals', { from: W.from, to: W.to, showZeroBalance: false, showParentAccount: true })).toEqual(R.AllJournalReport.rows.slice(2))
})
