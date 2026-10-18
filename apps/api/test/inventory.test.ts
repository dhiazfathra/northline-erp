import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import t2 from '../../../docs/reports/fixtures/sales-t2.json'
import t3 from '../../../docs/reports/fixtures/purchase-t3.json'
import t4 from '../../../docs/reports/fixtures/inventory-t4.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseInvoice, upsertVendor } from '../src/purchases/service'
import * as I from '../src/reports/inventory'
import { loadInventory, loadItemList, queryGeneralLedger } from '../src/reports/queries'
import itemListFx from '../../../docs/reports/fixtures/item-list.json'
import { createSalesInvoice, upsertCustomer, upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('inv')
  for (const a of [...t2.accounts, ...t3.accounts, ...t4.accounts].filter(a => !a.no.startsWith('NL-T1')))
    await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const c of t2.customers) await upsertCustomer(f.db, c)
  for (const v of t3.vendors) await upsertVendor(f.db, v)
  for (const i of t4.items) await upsertItem(f.db, i as any)
  for (const d of t4.documents as any[]) {
    if (d.kind === 'PurchaseInvoice') await createPurchaseInvoice(f.db, { idempotencyKey: `t4-${d.ref}`, number: d.number, vendor: d.vendor, bill: d.bill, date: d.date, description: d.description, lines: d.lines })
    else await createSalesInvoice(f.db, { idempotencyKey: `t4-${d.ref}`, number: d.number, customer: d.customer, date: d.date, description: d.description, lines: d.lines })
  }
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())

const W = { from: '2033-10-01', to: '2033-11-30' }
const body = (rows: string[][]) => rows.filter(r => !(r.length === 1 && (r[0] === rows[0]![0] || /^(Dari |Per Tgl\.|Cabang :)/.test(r[0]!))))
const rep = (p: string) => body((t4.reports as any)[p].rows)
const NL = (r: string[]) => /NL-T4/.test(r.join(' '))

test('FIFO journals: sales post HPP/Persediaan after the sales lines (GL history Oct–Nov 2033)', async () => {
  expect(await queryGeneralLedger(f.db, 'history', { ...W, showZeroBalance: false, showParentAccount: true })).toEqual(rep('GeneralLedgerHistoryReport'))
})
test('InventoryStockCardReport NL-T4-B1', async () => expect(I.stockCard(await loadInventory(f.db), ['NL-T4-B1'], W.from, W.to)).toEqual(rep('InventoryStockCardReport')))
test('InventoryValuationDetailReport NL-T4-B1', async () => expect(I.valuationDetail(await loadInventory(f.db), ['NL-T4-B1'], W.from, W.to)).toEqual(rep('InventoryValuationDetailReport')))
test('InventoryValuationReport (header + NL-T4 row)', async () => {
  const ours = I.inventoryValuation(await loadInventory(f.db), W.from, W.to), e = rep('InventoryValuationReport')
  expect(ours.slice(0, 3)).toEqual([e[0]!, e[1]!, e.find(NL)!])
})
test('InventoryAgingReport per 30 Nov 2033 (header + NL-T4 row)', async () => {
  const ours = I.inventoryAging(await loadInventory(f.db), '2033-11-30'), e = rep('InventoryAgingReport')
  expect(ours.slice(0, 2)).toEqual([e[0]!, e.find(NL)!])
})
test('ProfitabilityByItemReport Oct–Nov 2033', async () => {
  const sales = (await f.db.execute(sql`SELECT l.item_no, to_char(i.date,'YYYY-MM-DD') AS date, l.total FROM sales_invoice_lines l JOIN sales_invoices i ON i.number = l.invoice_number`))
    .map(r => ({ item: r.item_no as string, date: r.date as string, total: Number(r.total) }))
  expect(I.profitabilityByItem(await loadInventory(f.db), sales, W.from, W.to)).toEqual(rep('ProfitabilityByItemReport'))
})
test('selling more than in stock is rejected', async () => {
  await expect(createSalesInvoice(f.db, { idempotencyKey: 't4-oversell', customer: 'NL-T2-C1', date: '2033-12-01', lines: [{ item: 'NL-T4-B1', name: 'x', qty: 11, price: 1 }] })).rejects.toThrow('Stok tidak cukup')
})

test('ItemMutationByWarehouseReport NL-T4-B1', async () => expect(I.itemMutationByWarehouse(await loadInventory(f.db), ['NL-T4-B1'], W.from, W.to)).toEqual(rep('ItemMutationByWarehouseReport')))
test('WarehouseMutationByItemReport Utama', async () => expect(I.warehouseMutationByItem(await loadInventory(f.db), W.from, W.to)).toEqual(rep('WarehouseMutationByItemReport')))
test('WarehouseMutationSummaryReport Utama', async () => expect(I.warehouseMutationSummary(await loadInventory(f.db), W.from, W.to)).toEqual(rep('WarehouseMutationSummaryReport')))
test('QuantityItemByWarehouseReport (headers + NL-T4 row)', async () => {
  const e = rep('QuantityItemByWarehouseReport').filter(r => !/^Cabang :/.test(r[0]!))
  expect(I.quantityByWarehouse(await loadInventory(f.db), '2033-11-30').slice(0, 3)).toEqual([e[0]!, e[1]!, e.find(NL)!])
})
test('InventoryAgingByWarehouseReport (header + NL-T4 row)', async () => {
  const e = rep('InventoryAgingByWarehouseReport').filter(r => !/^Cabang :/.test(r[0]!))
  expect(I.inventoryAgingByWarehouse(await loadInventory(f.db), '2033-11-30').slice(0, 2)).toEqual([e[0]!, e.find(NL)!])
})

test('Profitabilitas per Faktur / per Pelanggan with FIFO cost; Penjualan per Barang (Oct–Nov 2033)', async () => {
  const { loadSales, cogsByInvoice } = await import('../src/reports/queries')
  const R = await import('../src/reports/receivables')
  const d = await loadSales(f.db), cogs = await cogsByInvoice(f.db)
  expect(R.profitabilityByInvoice(d, W.from, W.to, cogs)).toEqual(rep('ProfitabilityBySalesInvoiceReport'))
  expect(R.profitabilityByCustomer(d, W.from, W.to, cogs)).toEqual(rep('ProfitabilityByCustomerReport'))
  expect(R.salesByItem(d, W.from, W.to)).toEqual(rep('ViewSalesByItemReport'))
})

test('sales charts (series transcribed from Accurate PNGs)', async () => {
  const ch = (await import('../../../docs/reports/fixtures/charts.json')).default
  const R = await import('../src/reports/receivables'), { loadSales } = await import('../src/reports/queries')
  const d = await loadSales(f.db)
  expect(R.monthlySalesChart(d, W.from, W.to) as string[][]).toEqual(ch.AnnualSalesChartReport.bars)
  expect(R.customerShareChart(d, W.from, W.to)).toEqual(ch.TopSalesCustomerChartReport.legend)
  expect(R.itemShareChart(d, W.from, W.to)).toEqual(ch.TopSalesItemChartReport.legend)
})

test('ItemListReport per 30 Nov 2033 (Umum block, items this test seeds, Accurate order)', async () => {
  const { items, moves } = await loadItemList(f.db)
  const seeded = new Set(items.map(i => i.no))
  const expected = itemListFx.ItemListReport.rows.filter((r, i) => i < 4 || (r.length === 1 && r[0] === 'Umum') || (r.length > 1 && seeded.has(r[0]!)))
  expect(I.itemList(items, moves, '2033-11-30')).toEqual(expected)
})
