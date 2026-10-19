import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import fx from '../../../docs/reports/fixtures/contractor/trade-k.json'
import pfx from '../../../docs/reports/fixtures/contractor/projects-k.json'
import { connect, migrate } from '../src/db'
import { setCostingMethod } from '../src/inventory/fifo'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseInvoice, upsertVendor } from '../src/purchases/service'
import * as I from '../src/reports/inventory'
import * as P from '../src/reports/payables'
import { loadInventory, loadPurchases, loadSales } from '../src/reports/queries'
import * as R from '../src/reports/receivables'
import { createSalesInvoice, upsertCustomer, upsertItem } from '../src/sales/service'

// Kontraktor Demo (ADR-0035 finding 7, P6.2): NL-K6 purchases and sales of March 2052 replayed on Kontraktor's chart of
// accounts. Proves costing AVERAGE (S1 costs 15 x 110.000 = 1.650.000; FIFO would give 1.600.000) and aging from the
// invoice date (S2 and P3 are net 30: due-date ages 6 and 5 days would land in 1 - 30, Accurate prints 36 / 35 in 31 - 60).
const url = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:northline@localhost:55432/northline'
const schema = `ktrade_${process.pid}`
const { client, db } = connect(`${url}?options=-c%20search_path%3D${schema}`)

beforeAll(async () => {
  await client.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema}`)
  await migrate(client)
  const depth = (no: string | null): number => (no ? 1 + depth(pfx.accounts.find(a => a.no === no)!.parentNo) : 0)
  for (const a of [...pfx.accounts].sort((x, y) => depth(x.parentNo) - depth(y.parentNo)))
    await handle(db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any, parentNo: a.parentNo ?? undefined })
  await catchUp(db, ledgerProjection)
  await db.execute(sql`INSERT INTO ledger_settings (retained_earnings_account, fiscal_year_start_month) VALUES ('300002', 1)`)
  await db.transaction(tx => setCostingMethod(tx, 'AVERAGE'))
  for (const c of fx.customers) await upsertCustomer(db, c)
  for (const v of fx.vendors) await upsertVendor(db, v)
  for (const i of fx.items) await upsertItem(db, i as any)
  for (const d of fx.documents as any[]) {
    if (d.kind === 'PurchaseInvoice') await createPurchaseInvoice(db, { idempotencyKey: `k6-${d.ref}`, number: d.number, vendor: d.vendor, bill: d.bill, date: d.date, dueDate: d.dueDate, description: d.description, lines: d.lines })
    else await createSalesInvoice(db, { idempotencyKey: `k6-${d.ref}`, number: d.number, customer: d.customer, date: d.date, dueDate: d.dueDate, description: d.description, lines: d.lines })
  }
  await catchUp(db, ledgerProjection)
})
afterAll(async () => { await client.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await client.end() })

// The ERP prints `&gt;` as Accurate's older HTML captures did; these arrive decoded. Compare decoded text.
const dec = (rows: string[][]) => rows.map(r => r.map(c => c.replace(/&gt;/g, '>')))
const W = { from: '2052-03-01', to: '2052-03-31' }, AS_OF = '2052-04-30'
/** Page furniture out: company line, title, date range, branch line, footer. */
const rep = (p: string) => {
  const rows = (fx.reports as any)[p].rows as string[][], title = rows[1]![0]
  return rows.filter(r => !(/^(ACCURATE Accounting|Tercetak pada|Halaman )/.test(r[0]!) || (r.length === 1 && (r[0] === rows[0]![0] || r[0] === title || /^(Dari |Per Tgl\.|Cabang :)/.test(r[0]!)))))
}

test('Preferensi of Kontraktor Demo: costing AVERAGE, aging from INVOICEDATE', () =>
  expect([fx.preferences.featureCostingMethod, fx.preferences.othersAgingCalcFrom]).toEqual(['AVERAGE', 'INVOICEDATE']))

test('AgingReceivableReport and OutstandingSalesInvoiceReport 30 Apr 2052 (INVOICE_DATE)', async () => {
  const d = await loadSales(db)
  expect(dec(R.agingReceivable(d, AS_OF, 'INVOICE_DATE'))).toEqual(rep('AgingReceivableReport'))
  expect(dec(R.outstandingInvoices(d, AS_OF, 'INVOICE_DATE'))).toEqual(rep('OutstandingSalesInvoiceReport'))
  expect(dec(R.agingReceivable(d, AS_OF, 'DUE_DATE'))).not.toEqual(rep('AgingReceivableReport')) // S2 would sit in 1 - 30
})

test('AgingPayableReport and OutstandingPurchaseInvoiceReport 30 Apr 2052 (INVOICE_DATE)', async () => {
  const d = await loadPurchases(db)
  expect(dec(P.agingPayable(d, AS_OF, 'INVOICE_DATE'))).toEqual(rep('AgingPayableReport'))
  expect(dec(P.outstandingPurchases(d, AS_OF, 'INVOICE_DATE'))).toEqual(rep('OutstandingPurchaseInvoiceReport'))
  expect(dec(P.agingPayable(d, AS_OF, 'DUE_DATE'))).not.toEqual(rep('AgingPayableReport')) // P3 would sit in 1 - 30
})

test('InventoryValuationDetailReport NL-K6-B1 March 2052 under AVERAGE (S1 1.650.000)', async () =>
  expect(I.valuationDetail(await loadInventory(db), ['NL-K6-B1'], W.from, W.to)).toEqual(rep('InventoryValuationDetailReport')))

test('ProfitabilityByItemReport March 2052 under AVERAGE (BPP 1.760.000)', async () => {
  const s = (await db.execute(sql`SELECT l.item_no, to_char(i.date,'YYYY-MM-DD') AS date, l.total FROM sales_invoice_lines l JOIN sales_invoices i ON i.number = l.invoice_number`))
    .map(r => ({ item: r.item_no as string, date: r.date as string, total: Number(r.total) }))
  expect(I.profitabilityByItem(await loadInventory(db), s, W.from, W.to)).toEqual(rep('ProfitabilityByItemReport'))
})

test('HTTP: aging routes follow the company aging basis (ADR-0037)', async () => {
  const { createApp } = await import('../src/app')
  const { createFullUser } = await import('./fixture-db')
  const app = createApp(db)
  await db.execute(sql`UPDATE ledger_settings SET aging_basis = 'INVOICE_DATE'`)
  await createFullUser(db, 'nl-k6@example.test', 'rahasia-123')
  const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nl-k6@example.test', password: 'rahasia-123' }) })
  const cookie = login.headers.get('set-cookie')!.split(';')[0]!
  const get = async (p: string) => (await app.request('/api' + p, { headers: { cookie } })).json()
  expect(dec(await get(`/reports/receivables/aging?asOf=${AS_OF}`))).toEqual(rep('AgingReceivableReport'))
  expect(dec(await get(`/reports/payables/aging?asOf=${AS_OF}`))).toEqual(rep('AgingPayableReport'))
})
