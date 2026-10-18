import { afterAll, beforeAll, expect, test } from 'bun:test'
import t2 from '../../../docs/reports/fixtures/sales-t2.json'
import t3 from '../../../docs/reports/fixtures/purchase-t3.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import * as P from '../src/reports/payables'
import * as R from '../src/reports/receivables'
import { loadPurchases, queryGeneralLedger } from '../src/reports/queries'
import { createPurchaseInvoice, createPurchasePayment, upsertVendor } from '../src/purchases/service'
import { upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('ap')
  for (const a of [...t2.accounts, ...t3.accounts].filter(a => !a.no.startsWith('NL-T1')))
    await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const v of t3.vendors) await upsertVendor(f.db, v)
  for (const i of t3.items) await upsertItem(f.db, i as any)
  for (const d of t3.documents as any[]) {
    if (d.kind === 'PurchaseInvoice') await createPurchaseInvoice(f.db, { idempotencyKey: `t3-${d.ref}`, number: d.number, vendor: d.vendor, bill: d.bill, date: d.date, description: d.description, lines: d.lines })
    else await createPurchasePayment(f.db, { idempotencyKey: `t3-${d.ref}`, number: d.number, vendor: d.vendor, bank: d.bank, date: d.date, description: d.description, payments: d.payments })
  }
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())

const W = { from: '2033-07-01', to: '2033-08-31' }, AS_OF = '2033-09-15'
const body = (rows: string[][]) => rows.filter(r => !(r.length === 1 && (r[0] === rows[0]![0] || /^(Dari |Per Tgl\.|Cabang :)/.test(r[0]!))))
const rep = (p: string) => body((t3.reports as any)[p].rows)
const NL = (r: string[]) => !r.some(c => /^PT |ZZ-R0/.test(c))

const full: [string, (d: R.SalesData) => string[][]][] = [
  ['PurchaseInvoiceListReport', d => R.salesInvoiceList(d, W.from, W.to)],
  ['PurchasePaymentListReport', d => R.salesReceiptList(d, W.from, W.to)],
  ['APLedgerReport', d => R.arLedger(d, W.from, W.to)],
  ['APHistoryReport', d => R.arHistory(d, W.from, W.to)],
  ['VendorStatementReport', d => R.customerStatement(d, W.from, W.to)],
  ['APLedgerDetailReport', d => R.arLedgerDetail(d, W.from, W.to)],
  ['PurchaseInvoicePaidReport', d => R.salesInvoicePaid(d, W.from, W.to)],
  ['PurchaseByVendorReport', d => P.purchaseByVendor(d, W.from, W.to)],
  ['PurchaseByItemReport', d => P.purchaseByItem(d, W.from, W.to)],
  ['PurchaseByItemDetailReport', d => P.purchaseByItemDetail(d, W.from, W.to)],
  ['PurchaseByVendorDetailReport', d => P.purchaseByVendorDetail(d, W.from, W.to)],
  ['PurchasePaymentListDetailReport', d => P.purchasePaymentDetail(d, W.from, W.to)],
  ['PurchaseInvoiceDetailReport', d => P.purchaseInvoiceDetail(d, W.from, W.to)],
]
for (const [p, fn] of full) test(`${p} Jul–Aug 2033`, async () => expect(fn(await loadPurchases(f.db))).toEqual(rep(p)))

test('OutstandingPurchaseInvoiceReport per 15 Sep 2033 (NL-T3 vendor block)', async () => {
  const e = rep('OutstandingPurchaseInvoiceReport'), i = e.findIndex(r => r[0] === 'NL-T3 Pemasok A')
  const ours = P.outstandingPurchases(await loadPurchases(f.db), AS_OF)
  expect(ours.slice(0, -1)).toEqual([...e.slice(0, 2), ...e.slice(i, i + 4)])
})

test('AgingPayableReport per 15 Sep 2033 (header + NL-T3 row)', async () => {
  expect(P.agingPayable(await loadPurchases(f.db), AS_OF).slice(0, 2)).toEqual(rep('AgingPayableReport').filter(NL).slice(0, 2))
})

test('purchase journals print as Faktur Pembelian / Pembayaran Pembelian, expense debit first', async () => {
  const h = await queryGeneralLedger(f.db, 'history', { ...W, showZeroBalance: false, showParentAccount: true })
  expect(h.filter(r => r[1] === 'PI.2033.07.00001')).toEqual([
    ['Faktur Pembelian', 'PI.2033.07.00001', '600020', 'Beban Operasional Lainnya', 'NL-T3-P1', '600.000', '0'],
    ['Faktur Pembelian', 'PI.2033.07.00001', '210101', 'Hutang Usaha IDR', 'NL-T3-P1', '0', '600.000']])
  expect(h.find(r => r[1] === 'NL-T1-1101.2033.07.00001')![0]).toBe('Pembayaran Pembelian')
})

test('duplicate vendor bill number is rejected', async () => {
  await expect(createPurchaseInvoice(f.db, { idempotencyKey: 't3-dup-bill', vendor: 'NL-T3-V1', bill: 'NL-T3-P1', date: '2033-09-01', lines: [{ item: 'NL-T2-S1', qty: 1, price: 1 }] })).rejects.toThrow('sudah ada')
})

test('OutstandingPurchaseInvoicePerVendorReport (header + NL-T3 row)', async () => {
  expect(P.outstandingPerVendor(await loadPurchases(f.db), AS_OF).slice(0, 2)).toEqual(rep('OutstandingPurchaseInvoicePerVendorReport').slice(0, 2))
})

test('AgingPayableDetailReport (NL-T3 block)', async () => {
  expect(P.agingPayableDetail(await loadPurchases(f.db), AS_OF)).toEqual(rep('AgingPayableDetailReport').slice(0, 6))
})

test('VendorPayablePerMonthReport per 2033', async () => {
  expect(P.payablePerMonth(await loadPurchases(f.db), 2033)).toEqual(rep('VendorPayablePerMonthReport').filter(r => r[0] !== 'per 2033'))
})
