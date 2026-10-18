import { afterAll, beforeAll, expect, test } from 'bun:test'
import t2 from '../../../docs/reports/fixtures/sales-t2.json'
import t3 from '../../../docs/reports/fixtures/purchase-t3.json'
import t4 from '../../../docs/reports/fixtures/inventory-t4.json'
import t6 from '../../../docs/reports/fixtures/returns-t6.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseInvoice, upsertVendor } from '../src/purchases/service'
import * as I from '../src/reports/inventory'
import * as R from '../src/reports/receivables'
import { loadInventory, loadPurchases, loadSales, queryGeneralLedger } from '../src/reports/queries'
import { createPurchaseReturn, createSalesReturn } from '../src/returns/service'
import { createSalesInvoice, upsertCustomer, upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('ret')
  for (const a of [...t2.accounts, ...t3.accounts, ...t4.accounts, ...t6.accounts].filter(a => !a.no.startsWith('NL-T1')))
    await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const c of t2.customers) await upsertCustomer(f.db, c)
  for (const v of t3.vendors) await upsertVendor(f.db, v)
  for (const i of t4.items) await upsertItem(f.db, { ...i, ...(i.no === t6.itemPatch.no ? t6.itemPatch : {}) } as any)
  for (const d of t4.documents as any[]) {
    if (d.kind === 'PurchaseInvoice') await createPurchaseInvoice(f.db, { idempotencyKey: `t4-${d.ref}`, number: d.number, vendor: d.vendor, bill: d.bill, date: d.date, description: d.description, lines: d.lines })
    else await createSalesInvoice(f.db, { idempotencyKey: `t4-${d.ref}`, number: d.number, customer: d.customer, date: d.date, description: d.description, lines: d.lines })
  }
  for (const d of t6.documents) {
    const input = { idempotencyKey: `t6-${d.ref}`, number: d.number, invoice: d.invoice, date: d.date, description: d.description, lines: d.lines }
    if (d.kind === 'SalesReturn') await createSalesReturn(f.db, input)
    else await createPurchaseReturn(f.db, input)
  }
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())

const W = { from: '2033-12-01', to: '2033-12-31' }
const body = (rows: string[][]) => rows.filter(r => !(r.length === 1 && (r[0] === rows[0]![0] || /^(Dari |Per Tgl\.|Cabang :)/.test(r[0]!))))
const rep = (p: string) => body((t6.reports as any)[p].rows)

test('return journals (GL history Dec 2033)', async () => {
  expect(await queryGeneralLedger(f.db, 'history', { ...W, showZeroBalance: false, showParentAccount: true })).toEqual(rep('GeneralLedgerHistoryReport'))
})
test('ARLedgerReport / ARHistoryReport with the Retur column', async () => {
  const d = await loadSales(f.db)
  expect(R.arLedger(d, W.from, W.to)).toEqual(rep('ARLedgerReport'))
  expect(R.arHistory(d, W.from, W.to)).toEqual(rep('ARHistoryReport'))
})
test('APLedgerReport with the Retur column', async () => expect(R.arLedger(await loadPurchases(f.db), W.from, W.to)).toEqual(rep('APLedgerReport')))
for (const [p, sales, fn] of [
  ['SalesReturnListReport', true, R.returnList], ['SalesReturnDetailReport', true, R.returnDetail], ['SalesReturnByItemReport', true, R.returnByItem],
  ['PurchaseReturnListReport', false, R.returnList], ['PurchaseReturnDetailReport', false, R.returnDetail], ['PurchaseReturnByItemReport', false, R.returnByItem],
] as const)
  test(p, async () => expect(fn(sales ? await loadSales(f.db) : await loadPurchases(f.db), W.from, W.to)).toEqual(rep(p)))
test('InventoryStockCardReport and InventoryValuationDetailReport with returns and a non-zero opening', async () => {
  const d = await loadInventory(f.db)
  expect(I.stockCard(d, ['NL-T4-B1'], W.from, W.to)).toEqual(rep('InventoryStockCardReport'))
  expect(I.valuationDetail(d, ['NL-T4-B1'], W.from, W.to)).toEqual(rep('InventoryValuationDetailReport'))
})
test('returning more than invoiced is rejected', async () => {
  await expect(createSalesReturn(f.db, { idempotencyKey: 't6-over-return', invoice: 'SI.2033.11.00001', date: '2033-12-20', lines: [{ item: 'NL-T4-B1', qty: 6, price: 21000 }] })).rejects.toThrow('melebihi')
})
