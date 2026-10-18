import { afterAll, beforeAll, expect, test } from 'bun:test'
import t2 from '../../../docs/reports/fixtures/sales-t2.json'
import t3 from '../../../docs/reports/fixtures/purchase-t3.json'
import t4 from '../../../docs/reports/fixtures/inventory-t4.json'
import t6 from '../../../docs/reports/fixtures/returns-t6.json'
import t9 from '../../../docs/reports/fixtures/purchase-order-t9.json'
import t10 from '../../../docs/reports/fixtures/adjustment-t10.json'
import { createItemAdjustment } from '../src/inventory/adjustment'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseInvoice, createReceiveItem, upsertVendor } from '../src/purchases/service'
import * as I from '../src/reports/inventory'
import { loadAdjustments, loadInventory, queryGeneralLedger } from '../src/reports/queries'
import { createPurchaseReturn, createSalesReturn } from '../src/returns/service'
import { createSalesInvoice, upsertCustomer, upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('adj')
  for (const a of [...t2.accounts, ...t3.accounts, ...t4.accounts, ...t6.accounts, ...t10.accounts].filter(a => !a.no.startsWith('NL-T1')))
    await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const c of t2.customers) await upsertCustomer(f.db, c)
  for (const v of t3.vendors) await upsertVendor(f.db, v)
  for (const i of t4.items) await upsertItem(f.db, { ...i, ...t6.itemPatch } as any)
  for (const d of t4.documents as any[]) d.kind === 'PurchaseInvoice'
    ? await createPurchaseInvoice(f.db, { idempotencyKey: `a-${d.ref}`, ...d }) : await createSalesInvoice(f.db, { idempotencyKey: `a-${d.ref}`, ...d })
  for (const d of t6.documents as any[]) d.kind === 'SalesReturn' ? await createSalesReturn(f.db, { idempotencyKey: `a-${d.ref}`, ...d }) : await createPurchaseReturn(f.db, { idempotencyKey: `a-${d.ref}`, ...d })
  const [, ri, pi] = t9.documents as any[]
  await createReceiveItem(f.db, ri)
  await createPurchaseInvoice(f.db, { idempotencyKey: 'a-t9-pi-0001', ...pi })
  for (const d of t10.documents as any[]) await createItemAdjustment(f.db, { idempotencyKey: `a-${d.number}`, ...d })
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())

const W = { from: '2034-07-01', to: '2034-07-31' }
const body = (rows: string[][]) => rows.filter(r => !(r.length === 1 && (r[0] === rows[0]![0] || /^(Dari |Per Tgl\.|Cabang :)/.test(r[0]!))))
const rep = (p: string) => body((t10.reports as any)[p].rows)

test('adjustment journals (GL history Jul 2034)', async () => {
  expect(await queryGeneralLedger(f.db, 'history', { ...W, showZeroBalance: false, showParentAccount: true })).toEqual(rep('GeneralLedgerHistoryReport'))
})
test('stock card and valuation detail with adjustments', async () => {
  const d = await loadInventory(f.db)
  expect(I.stockCard(d, ['NL-T4-B1'], W.from, W.to)).toEqual(rep('InventoryStockCardReport'))
  expect(I.valuationDetail(d, ['NL-T4-B1'], W.from, W.to)).toEqual(rep('InventoryValuationDetailReport'))
})
test('InventoryAdjustmentDetailReport', async () => expect(I.adjustmentDetail(await loadAdjustments(f.db), W.from, W.to)).toEqual(rep('InventoryAdjustmentDetailReport')))

test('linked sales order → delivery → invoice (sales-order-t14.json)', async () => {
  const t14 = (await import('../../../docs/reports/fixtures/sales-order-t14.json')).default
  const S = await import('../src/sales/service'), R = await import('../src/reports/receivables'), Q = await import('../src/reports/queries')
  for (const a of t14.accounts) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  await S.upsertItem(f.db, { ...t4.items[0], ...t14.itemPatch } as any)
  await S.createSalesOrder(f.db, t14.order)
  await S.createDeliveryOrder(f.db, { idempotencyKey: 't14-do-0001', ...t14.delivery })
  await S.createSalesInvoice(f.db, { idempotencyKey: 't14-si-0001', ...t14.invoice })
  await catchUp(f.db, ledgerProjection)
  const r = (p: string) => body((t14.reports as any)[p].rows), O = { from: '2034-10-01', to: '2034-10-31' }
  expect(await queryGeneralLedger(f.db, 'history', { ...O, showZeroBalance: false, showParentAccount: true })).toEqual(r('GeneralLedgerHistoryReport'))
  const d = await Q.loadSales(f.db), ds = await Q.loadDeliveries(f.db)
  expect(R.deliveryList(d, ds, O.from, O.to)).toEqual(r('DeliveryOrderListReport'))
  expect(R.deliveryDetail(d, ds, O.from, O.to)).toEqual(r('DeliveryOrderDetailReport'))
  expect(R.deliveryHistory(d, ds, O.from, O.to)).toEqual(r('DeliveryOrderHistorySummaryReport'))
  expect(R.flowHistory(d, O.from, O.to, true)).toEqual(r('SalesFlowHistoryReport'))
})

test('item transfers between warehouses via transit (transfer-t15.json)', async () => {
  const t15 = (await import('../../../docs/reports/fixtures/transfer-t15.json')).default
  const { createItemTransfer } = await import('../src/inventory/adjustment'), Q = await import('../src/reports/queries')
  for (const t of t15.transfers) await createItemTransfer(f.db, t as any)
  const r = (p: string) => body((t15.reports as any)[p].rows).filter(x => !/^Cabang :/.test(x[0]!)), O = { from: '2034-11-01', to: '2034-11-30' }
  const d = await Q.loadInventory(f.db), NL = (x: string[]) => /^(NL-T4|Nama Barang$|Kuantitas)/.test(x[0]!)
  expect(I.stockCard(d, ['NL-T4-B1'], O.from, O.to)).toEqual(r('InventoryStockCardReport'))
  expect(I.itemMutationByWarehouse(d, ['NL-T4-B1'], O.from, O.to)).toEqual(r('ItemMutationByWarehouseReport'))
  expect(I.warehouseMutationSummary(d, O.from, O.to, ['Utama', 'NL-Gudang B'])).toEqual(r('WarehouseMutationSummaryReport'))
  expect(I.transferList(await Q.loadTransfers(f.db), O.from, O.to)).toEqual(r('ItemTransferListReport'))
  expect(I.quantityByWarehouse(d, '2034-11-30', t15.warehouses).filter(NL)).toEqual(r('QuantityItemByWarehouseReport').filter(NL))
  expect(await queryGeneralLedger(f.db, 'history', { ...O, showZeroBalance: false, showParentAccount: true })).toEqual(r('GeneralLedgerHistoryReport'))
})

test('Tukar Faktur (exchange-t16.json)', async () => {
  const t16 = (await import('../../../docs/reports/fixtures/exchange-t16.json')).default
  const S = await import('../src/sales/service'), R = await import('../src/reports/receivables'), Q = await import('../src/reports/queries')
  await S.createExchangeInvoice(f.db, t16.exchange)
  const r = (p: string) => body((t16.reports as any)[p].rows), O = { from: '2034-10-01', to: '2034-10-31' }, d = await Q.loadSales(f.db)
  expect(R.exchangeDetail(d, await Q.loadExchanges(f.db), O.from, O.to, t16.today)).toEqual(r('ExchangeInvoiceDetailReport'))
  expect(R.flowHistory(d, O.from, O.to, true)).toEqual(r('SalesFlowHistoryReport'))
})

test('StockMovementByWarehouseReport over the T4..T15 chain (stock-movement.json; runs after the T15 transfers)', async () => {
  const fx = (await import('../../../docs/reports/fixtures/stock-movement.json')).default, Q = await import('../src/reports/queries')
  const d = await Q.loadInventory(f.db)
  for (const c of fx.StockMovementByWarehouseReport) expect(I.stockMovementByWarehouse(d, c.warehouse, c.from, c.to)).toEqual(c.rows)
})
