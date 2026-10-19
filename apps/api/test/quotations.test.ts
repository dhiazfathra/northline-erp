import { afterAll, beforeAll, expect, test } from 'bun:test'
import rd from '../../../docs/reports/fixtures/retail/quotation-rd.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import * as R from '../src/reports/quotations'
import { createSalesInvoice, createSalesOrder, createSalesQuotation, upsertCustomer, upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

// Retail Demo, NL-RD documents of 2044 (fixtures/retail/quotation-rd.json, ADR-0027): quotations, orders taken from them,
// partial invoicing. The captures run over 2044 only, so the sandbox's own 2016-17 documents are outside the period.
let f: Awaited<ReturnType<typeof fixtureDb>>, d: R.OrderData
beforeAll(async () => {
  f = await fixtureDb('sq')
  for (const a of rd.accounts) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const c of rd.customers) await upsertCustomer(f.db, c)
  for (const i of rd.items) await upsertItem(f.db, i as any)
  for (const q of rd.quotations) await createSalesQuotation(f.db, q)
  for (const o of rd.orders) await createSalesOrder(f.db, o)
  for (const x of rd.invoices) await createSalesInvoice(f.db, { idempotencyKey: `quotation-rd-${x.number}`, ...x })
  await catchUp(f.db, ledgerProjection)
  d = await R.loadOrderData(f.db)
})
afterAll(() => f.close())

/** Drops page chrome: title, period/branch lines, footer. */
const body = (rows: string[][]) => rows.filter(r => !(r.length === 1 && (r[0] === rows[0]![0] || /^(Dari |Cabang :|ACCURATE Accounting|Tercetak pada)/.test(r[0]!))) && !/^Halaman /.test(r[0]!))
const rep = (p: string) => body((rd.reports as any)[p].rows)
const Y = ['2044-01-01', '2044-12-31'] as const

test('SalesQuotationListReport 2044', () => expect(R.docList(d.quotations, ...Y, 'SQ')).toEqual(rep('SalesQuotationListReport')))
test('SalesQuotationDetailReport 2044', () => expect(R.docDetail(d.quotations, ...Y)).toEqual(rep('SalesQuotationDetailReport')))
test('SalesQuotationByCustomerReport 2044', () => expect(R.openByCustomer(d.quotations, ...Y)).toEqual(rep('SalesQuotationByCustomerReport')))
test('SalesQuotationByItemReport 2044', () => expect(R.openByItem(d.quotations, ...Y)).toEqual(rep('SalesQuotationByItemReport')))
test('SalesOrderListReport 2044', () => expect(R.docList(d.orders, ...Y, 'SO')).toEqual(rep('SalesOrderListReport')))
test('SalesOrderDetailReport 2044', () => expect(R.docDetail(d.orders, ...Y)).toEqual(rep('SalesOrderDetailReport')))
test('SalesOrderByCustomerReport 2044', () => expect(R.openByCustomer(d.orders, ...Y)).toEqual(rep('SalesOrderByCustomerReport')))
test('SalesOrderByItemReport 2044', () => expect(R.openByItem(d.orders, ...Y)).toEqual(rep('SalesOrderByItemReport')))
test('statuses: partial quotation and order', () => {
  expect(d.quotations.map(R.status)).toContain('Sebagian diproses')
  expect(d.orders.map(R.status)).toContain('Sebagian diproses')
})
