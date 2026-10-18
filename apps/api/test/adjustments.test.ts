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
