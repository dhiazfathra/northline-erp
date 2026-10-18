import { afterAll, beforeAll, expect, test } from 'bun:test'
import t2 from '../../../docs/reports/fixtures/sales-t2.json'
import t3 from '../../../docs/reports/fixtures/purchase-t3.json'
import t4 from '../../../docs/reports/fixtures/inventory-t4.json'
import t7 from '../../../docs/reports/fixtures/downpayment-t7.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseInvoice, upsertVendor } from '../src/purchases/service'
import * as R from '../src/reports/receivables'
import { loadSales, queryGeneralLedger } from '../src/reports/queries'
import { createSalesDownPayment, createSalesInvoice, createSalesReceipt, upsertCustomer, upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
const doc = async (d: any) => {
  const k = `dp-${d.ref}`
  if (d.kind === 'SalesInvoice') return createSalesInvoice(f.db, { idempotencyKey: k, number: d.number, customer: d.customer, date: d.date, dueDate: d.dueDate, description: d.description, lines: d.lines, downPayments: d.downPayments ?? [] })
  if (d.kind === 'SalesReceipt') return createSalesReceipt(f.db, { idempotencyKey: k, number: d.number, customer: d.customer, bank: d.bank, date: d.date, description: d.description, payments: d.payments })
  if (d.kind === 'SalesDownPayment') return createSalesDownPayment(f.db, { idempotencyKey: k, number: d.number, customer: d.customer, date: d.date, description: d.description, amount: d.amount, dpAccount: d.dpAccount })
  if (d.kind === 'PurchaseInvoice') return createPurchaseInvoice(f.db, { idempotencyKey: k, number: d.number, vendor: d.vendor, bill: d.bill, date: d.date, description: d.description, lines: d.lines })
}
beforeAll(async () => {
  f = await fixtureDb('dp')
  for (const a of [...t2.accounts, ...t3.accounts, ...t4.accounts, ...t7.accounts].filter(a => !a.no.startsWith('NL-T1')))
    await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const c of t2.customers) await upsertCustomer(f.db, c)
  for (const v of t3.vendors) await upsertVendor(f.db, v)
  for (const i of [...t2.items, ...t4.items]) await upsertItem(f.db, i as any)
  for (const d of [...t2.documents, ...t4.documents, ...t7.documents]) await doc(d)
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())

const W = { from: '2034-04-01', to: '2034-04-30' }
const body = (rows: string[][]) => rows.filter(r => !(r.length === 1 && (r[0] === rows[0]![0] || /^(Dari |Per Tgl\.|Cabang :)/.test(r[0]!))))
const rep = (p: string) => body((t7.reports as any)[p].rows)

test('down-payment journals (GL history Apr 2034)', async () => {
  expect(await queryGeneralLedger(f.db, 'history', { ...W, showZeroBalance: false, showParentAccount: true })).toEqual(rep('GeneralLedgerHistoryReport'))
})
for (const [p, fn] of [
  ['ARLedgerReport', R.arLedger], ['ARHistoryReport', R.arHistory], ['ARLedgerDetailReport', R.arLedgerDetail], ['SalesInvoiceListReport', R.salesInvoiceList],
  ['SalesDownPaymentByCustomerReport', R.downPaymentsByCustomer], ['SalesInvoiceDownPaymentDetailReport', R.downPaymentUsage],
] as const) test(`${p} Apr 2034`, async () => expect(fn(await loadSales(f.db), W.from, W.to)).toEqual(rep(p)))

test('OutstandingSalesInvoiceReport per 30 Apr 2034 (customer A block): DP deducted from the invoice owing', async () => {
  const e = rep('OutstandingSalesInvoiceReport'), i = e.findIndex(r => r[0] === 'NL-T2 Pelanggan A'), end = e.findIndex((r, k) => k > i && r.length === 3)
  const ours = R.outstandingInvoices(await loadSales(f.db), '2034-04-30'), j = ours.findIndex(r => r[0] === 'NL-T2 Pelanggan A')
  expect(ours.slice(j, j + (end - i) + 1)).toEqual(e.slice(i, end + 1))
})
