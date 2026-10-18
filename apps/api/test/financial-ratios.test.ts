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

test('finance charts: net worth, liquidity, ROA, ROE from Accurate statement totals; revenue vs expense from the ledger', async () => {
  const ch = (await import('../../../docs/reports/fixtures/charts.json')).default
  const F = await import('../src/reports/financial-ratios')
  const ends = ['2030-12-31', '2031-01-31', '2031-02-28'].map(d => bs[d]!)
  const pls = [{ revenue: 3000000, cogs: 0, operating: 3000000, net: 3000000 }, pl['2031-01']!, pl['2031-02']!]
  expect(F.netWorthChart(ends)).toEqual(ch.NetWorthChartReport.series)
  expect(F.liquidityChart(ends)).toEqual(ch.LiquidityRatioChartReport.series)
  expect(F.returnOnAssetChart(ends, pls)).toEqual(ch.ReturnOnAssetChartReport.series)
  expect(F.returnOnEquityChart(ends, pls)).toEqual(ch.ReturnOnEquityChartReport.series)

  const { fixtureDb } = await import('./fixture-db'), { sql } = await import('drizzle-orm')
  const f = await fixtureDb('rv')
  try {
    const months = [['2030-12-01', '2030-12-31'], ['2031-01-01', '2031-01-31'], ['2031-02-01', '2031-02-28']]
    const rows = await Promise.all(months.map(async ([a, b]) => {
      const [r] = await f.db.execute(sql`SELECT COALESCE(SUM(CASE WHEN ac.type IN ('REVENUE','OTHER_INCOME') THEN d.credit - d.debit END), 0) AS rev,
        COALESCE(SUM(CASE WHEN ac.type IN ('COGS','EXPENSE','OTHER_EXPENSE') THEN d.debit - d.credit END), 0) AS exp
        FROM account_daily_balances d JOIN accounts ac ON ac.no = d.account_no WHERE d.date BETWEEN ${a} AND ${b}`)
      return { revenue: Number(r!.rev) / 100, expense: Number(r!.exp) / 100 }
    }))
    expect(F.revenueVsExpenseChart(rows)).toEqual(ch.RevenueToExpenseComparisonChartReport.series)
  } finally { await f.close() }
})

test('Fokus Keuangan 2031 vs 2030: every cell except the Modal Kerja % (ADR-0013)', async () => {
  const { financialFocus } = await import('../src/reports/financial-ratios')
  const got = financialFocus(bs['2031-12-31']!, bs['2030-12-31']!, pl['2031']!, pl['2030']!)
  const want = fx.FinancialFocusReport.rows.slice(1)
  const mask = (rows: string[][]) => rows.map(r => r[0] === 'Modal Kerja' ? r.slice(0, 3) : r)
  expect(mask(got)).toEqual(mask(want))
})
