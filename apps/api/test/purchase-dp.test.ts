import { afterAll, beforeAll, expect, test } from 'bun:test'
import t2 from '../../../docs/reports/fixtures/sales-t2.json'
import t3 from '../../../docs/reports/fixtures/purchase-t3.json'
import t4 from '../../../docs/reports/fixtures/inventory-t4.json'
import t8 from '../../../docs/reports/fixtures/purchase-dp-t8.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseDownPayment, createPurchaseInvoice, createPurchasePayment, upsertVendor } from '../src/purchases/service'
import * as R from '../src/reports/receivables'
import { loadPurchases, queryGeneralLedger } from '../src/reports/queries'
import { createSalesInvoice, upsertCustomer, upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
const doc = async (d: any) => {
  const k = `pdp-${d.ref}`
  if (d.kind === 'PurchaseInvoice') return createPurchaseInvoice(f.db, { idempotencyKey: k, number: d.number, vendor: d.vendor, bill: d.bill, date: d.date, description: d.description, lines: d.lines, downPayments: d.downPayments ?? [] })
  if (d.kind === 'PurchasePayment') return createPurchasePayment(f.db, { idempotencyKey: k, number: d.number, vendor: d.vendor, bank: d.bank, date: d.date, description: d.description, payments: d.payments })
  if (d.kind === 'PurchaseDownPayment') return createPurchaseDownPayment(f.db, { idempotencyKey: k, number: d.number, vendor: d.vendor, bill: d.bill, date: d.date, description: d.description, amount: d.amount, dpAccount: d.dpAccount })
  if (d.kind === 'SalesInvoice') return createSalesInvoice(f.db, { idempotencyKey: k, number: d.number, customer: d.customer, date: d.date, description: d.description, lines: d.lines })
}
beforeAll(async () => {
  f = await fixtureDb('pdp')
  for (const a of [...t2.accounts, ...t3.accounts, ...t4.accounts, ...t8.accounts].filter(a => !a.no.startsWith('NL-T1')))
    await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const c of t2.customers) await upsertCustomer(f.db, c)
  for (const v of t3.vendors) await upsertVendor(f.db, v)
  for (const i of [...t3.items, ...t4.items]) await upsertItem(f.db, i as any)
  for (const d of [...t3.documents, ...t4.documents, ...t8.documents]) await doc(d)
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())

const W = { from: '2034-05-01', to: '2034-05-31' }
const body = (rows: string[][]) => rows.filter(r => !(r.length === 1 && (r[0] === rows[0]![0] || /^(Dari |Per Tgl\.|Cabang :)/.test(r[0]!))))
const rep = (p: string) => body((t8.reports as any)[p].rows)

test('purchase down-payment journals (GL history May 2034)', async () => {
  expect(await queryGeneralLedger(f.db, 'history', { ...W, showZeroBalance: false, showParentAccount: true })).toEqual(rep('GeneralLedgerHistoryReport'))
})
for (const [p, fn] of [
  ['APLedgerReport', R.arLedger], ['APHistoryReport', R.arHistory], ['APLedgerDetailReport', R.arLedgerDetail], ['PurchaseInvoiceListReport', R.salesInvoiceList],
  ['PurchaseDownPaymentByVendorReport', R.downPaymentsByCustomer], ['PurchaseInvoiceDownPaymentDetailReport', R.downPaymentUsage],
] as const) test(`${p} May 2034`, async () => expect(fn(await loadPurchases(f.db), W.from, W.to)).toEqual(rep(p)))
