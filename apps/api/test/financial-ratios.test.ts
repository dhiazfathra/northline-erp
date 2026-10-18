import { expect, test } from 'bun:test'
import fx from '../../../docs/reports/fixtures/financial-ratios.json'
import { financialRatios, type RatioInput } from '../src/reports/financial-ratios'

const bs = fx.balanceSheets as Record<string, RatioInput['end']>
const pl = fx.profitLoss as Record<string, RatioInput['pl']>
const col = (start: string, end: string, period: string): RatioInput => ({ start: bs[start]!, end: bs[end]!, pl: pl[period]! })

test('Rasio Keuangan (Per Bulan) Februari 2031 vs Januari', () => {
  expect(financialRatios(col('2031-01-31', '2031-02-28', '2031-02'), col('2030-12-31', '2031-01-31', '2031-01'), true)).toEqual(fx.FinancialRatioPerMonthReport.rows)
})

test('Rasio Keuangan (Per Tahun) 2031 vs 2030', () => {
  expect(financialRatios(col('2030-12-31', '2031-12-31', '2031'), col('2029-12-31', '2030-12-31', '2030'), false)).toEqual(fx.FinancialRatioReport.rows)
})

test('queryFinancialRatios runs on our own statements (fixture ledger)', async () => {
  const { fixtureDb } = await import('./fixture-db')
  const { queryFinancialRatios } = await import('../src/reports/queries')
  const f = await fixtureDb('fr')
  try {
    const rows = await queryFinancialRatios(f.db, 2031, 2)
    expect(rows).toHaveLength(fx.FinancialRatioPerMonthReport.rows.length)
    // fixture-only ledger: Feb 2031 net income 1.000.000 on revenue 2.000.000
    expect(rows.find(r => r[0] === 'Net Profit Margin')!.slice(1, 2)).toEqual(['50'])
  } finally { await f.close() }
})
