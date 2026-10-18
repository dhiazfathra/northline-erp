import { afterAll, beforeAll, expect, test } from 'bun:test'
import t3 from '../../../docs/reports/fixtures/purchase-t3.json'
import t4 from '../../../docs/reports/fixtures/inventory-t4.json'
import t9 from '../../../docs/reports/fixtures/purchase-order-t9.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseInvoice, createPurchaseOrder, createReceiveItem, upsertVendor } from '../src/purchases/service'
import * as P from '../src/reports/payables'
import * as R from '../src/reports/receivables'
import { loadOrders, loadPurchases } from '../src/reports/queries'
import { upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('po')
  for (const a of [...t3.accounts, ...t4.accounts]) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await handle(f.db, { type: 'OpenAccount', idempotencyKey: 'acct-400001', no: '400001', name: 'Penjualan', accountType: 'REVENUE' })
  await catchUp(f.db, ledgerProjection)
  for (const v of t3.vendors) await upsertVendor(f.db, v)
  for (const i of t4.items) await upsertItem(f.db, i as any)
  const [po, ri, pi] = t9.documents as any[]
  await createPurchaseOrder(f.db, po)
  await createReceiveItem(f.db, ri)
  await createPurchaseInvoice(f.db, { idempotencyKey: 't9-pi-0001', ...pi })
})
afterAll(() => f.close())

const W = { from: '2034-06-01', to: '2034-06-30' }
const body = (rows: string[][]) => rows.filter(r => !(r.length === 1 && (r[0] === rows[0]![0] || /^(Dari |Per Tgl\.|Cabang :)/.test(r[0]!))))
const rep = (p: string) => body((t9.reports as any)[p].rows).filter(r => !/^Cabang :/.test(r[0]!))

for (const [p, fn] of [['PurchaseOrderListReport', P.orderList], ['PurchaseOrderDetailReport', P.orderDetail], ['PurchaseOrderByItemReport', P.orderByItem],
  ['PurchaseOrderByVendorReport', P.orderByVendor], ['ReceiveItemListReport', P.receiveList], ['ReceiveItemDetailReport', P.receiveDetail]] as const)
  test(`${p} Jun 2034`, async () => expect(fn(await loadOrders(f.db), W.from, W.to)).toEqual(rep(p)))

test('PurchaseFlowHistoryReport with unlinked receipt and order', async () => {
  const o = await loadOrders(f.db)
  expect(R.flowHistory(await loadPurchases(f.db), W.from, W.to, false, { receipts: o.receipts.map(r => r.number), orders: o.orders.map(r => r.number) })).toEqual(rep('PurchaseFlowHistoryReport'))
})
