import { afterAll, beforeAll, expect, test } from 'bun:test'
import fx from '../../../docs/reports/fixtures/retail/inventory-re.json'
import { createItemTransfer, upsertWarehouse } from '../src/inventory/adjustment'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseInvoice, createVendorPrice, upsertVendor } from '../src/purchases/service'
import * as I from '../src/reports/inventory'
import { vendorPriceAdjustmentDetail } from '../src/reports/payables'
import { loadSerialMoves, loadTransfers, loadVendorPrices, loadWarehouses } from '../src/reports/queries'
import * as SN from '../src/reports/serial-numbers'
import { upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

// Retail Demo (ADR-0024): the NL-RE documents seeded into a fresh schema, every report toEqual the captured Accurate rows.
let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('inv_re')
  for (const a of fx.accounts) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const v of fx.vendors) await upsertVendor(f.db, v)
  for (const i of fx.items) await upsertItem(f.db, i as any)
  for (const w of fx.warehouses) await upsertWarehouse(f.db, w)
  for (const d of fx.documents as any[]) {
    if (d.kind === 'PurchaseInvoice') await createPurchaseInvoice(f.db, { idempotencyKey: `re-${d.number}`, ...d })
    else if (d.kind === 'ItemTransfer') await createItemTransfer(f.db, d)
    else await createVendorPrice(f.db, d)
  }
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())

type Cap = { param: any; rows: string[][]; printedAt?: string }
const caps = (planId: string): Cap[] => { const r = (fx.reports as any)[planId]; return [r, ...(r.variants ?? [])] }
const iso = (d: string) => `${d.slice(6, 10)}-${d.slice(3, 5)}-${d.slice(0, 2)}`
const ids = (sel: any, map: Record<string, any>) => [sel].flat().map((x: any) => map[String(x.id)])
const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** "19 October 2026 - 03:52" (Asia/Jakarta) → ISO instant. */
const printed = (s: string) => { const [d, m, y, , t] = s.split(' '); return `${y}-${String(M.indexOf(m!) + 1).padStart(2, '0')}-${d!.padStart(2, '0')}T${t}:00+07:00` }

test('SerialNumberStockReport, …PerWarehouseReport, …PerItemReport (as-of 31 Dec and in transit 3 Feb 2045)', async () => {
  const ms = await loadSerialMoves(f.db)
  for (const c of caps('SerialNumberStockReport')) expect(SN.serialStock(ms, ids(c.param.selectedItem, fx.ids.items), iso(c.param.asOfDate))).toEqual(c.rows)
  for (const c of caps('SerialNumberStockPerWarehouseReport')) expect(SN.serialStockPerWarehouse(ms, ids(c.param.selectedItem, fx.ids.items), iso(c.param.asOfDate))).toEqual(c.rows)
  for (const c of caps('SerialNumberStockPerItemReport')) expect(SN.serialStockPerItem(ms, ids(c.param.selectedWarehouse, fx.ids.warehouses), iso(c.param.asOfDate))).toEqual(c.rows)
})

test('SerialNumberMutationReport: every warehouse leg, running Saldo over all warehouses', async () => {
  const ms = await loadSerialMoves(f.db)
  for (const c of caps('SerialNumberMutationReport'))
    expect(SN.serialMutation(ms, ids(c.param.selectedSerialnumber, fx.ids.serials).map(([item, serial]: string[]) => ({ item: item!, serial: serial! })))).toEqual(c.rows)
})

test('SerialNumberExpiredSoonReport: batch expiry in range, Sisa Hari from the print moment', async () => {
  const ms = await loadSerialMoves(f.db)
  for (const c of caps('SerialNumberExpiredSoonReport')) expect(SN.serialExpiredSoon(ms, iso(c.param.startDate), iso(c.param.endDate), printed(c.printedAt!))).toEqual(c.rows)
})

test('ItemTransferDetailReport, UncompletedItemTransferReport (shortfall), DifferenceGoodsTransitItemTransferReport', async () => {
  const ts = await loadTransfers(f.db), ws = await loadWarehouses(f.db)
  for (const c of caps('ItemTransferDetailReport')) expect(I.transferDetail(ts, ws, iso(c.param.startDate), iso(c.param.endDate))).toEqual(c.rows)
  for (const c of caps('UncompletedItemTransferReport')) expect(I.uncompletedTransfers(ts, iso(c.param.startDate), iso(c.param.endDate))).toEqual(c.rows)
  for (const c of caps('DifferenceGoodsTransitItemTransferReport')) expect(I.transitDifference(iso(c.param.asOfDate))).toEqual(c.rows)
})

test('WarehouseListReport', async () => {
  for (const c of caps('WarehouseListReport')) expect(I.warehouseList(await loadWarehouses(f.db))).toEqual(c.rows)
})

test('VendorPriceAdjustmentDetailReport', async () => {
  const ps = await loadVendorPrices(f.db)
  for (const c of caps('VendorPriceAdjustmentDetailReport')) expect(vendorPriceAdjustmentDetail(ps, iso(c.param.startDate), iso(c.param.endDate))).toEqual(c.rows)
})
