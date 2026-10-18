import { afterAll, beforeAll, expect, test } from 'bun:test'
import t20 from '../../../docs/reports/fixtures/price-t20.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import * as P from '../src/reports/pricing'
import { createSellingPriceAdjustment } from '../src/sales/pricing'
import { upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('price')
  for (const a of t20.accounts) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const i of t20.items) await upsertItem(f.db, i as any)
  for (const a of t20.adjustments) await createSellingPriceAdjustment(f.db, a as any)
})
afterAll(() => f.close())

const { from, to } = t20.window, R = t20.reports
test('SellingPriceAdjustmentDetailReport Dec 2035', async () => expect(P.adjustmentDetail(await P.loadPriceAdjustments(f.db), 'PRICE', from, to)).toEqual(R.SellingPriceAdjustmentDetailReport.rows))
test('SellingDiscountAdjustmentDetailReport Dec 2035', async () => expect(P.adjustmentDetail(await P.loadPriceAdjustments(f.db), 'DISCOUNT', from, to)).toEqual(R.SellingDiscountAdjustmentDetailReport.rows))
test('SellingPriceAdjustmentDetailPerCategoryReport Dec 2035', async () => expect(P.adjustmentPerCategory(await P.loadPriceAdjustments(f.db), 'PRICE', from, to)).toEqual(R.SellingPriceAdjustmentDetailPerCategoryReport.rows))
test('SellingDiscountAdjustmentDetailPerCategoryReport Dec 2035', async () => expect(P.adjustmentPerCategory(await P.loadPriceAdjustments(f.db), 'DISCOUNT', from, to)).toEqual(R.SellingDiscountAdjustmentDetailPerCategoryReport.rows))
test('SellingPriceAdjustmentHistoryReport Dec 2035', async () => expect(P.priceHistory(await P.loadPriceAdjustments(f.db), from, to)).toEqual(R.SellingPriceAdjustmentHistoryReport.rows))
