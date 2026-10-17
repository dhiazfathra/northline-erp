import { describe, expect, it } from 'vitest'
import { balanceSheet, balances, journals, profitAndLoss, trialBalanceTotals } from './fixtures'

// Figures stated on the design's Flow Boards / Changes Board.
describe('S0–S8 fixture ledger', () => {
  it('every journal balances', () => {
    for (const j of journals) {
      const d = j.lines.reduce((s, l) => s + l.debit, 0)
      const c = j.lines.reduce((s, l) => s + l.credit, 0)
      expect(d, j.jv).toBe(c)
    }
  })

  it('S0 alone gives the S0 trial balance', () => {
    const bal = balances('01/10/2026', '04/10/2026')
    expect(bal.get('1101')).toBe(11_500_000)
    expect(bal.get('6001')).toBe(3_000_000)
    expect(bal.get('3001')).toBe(-10_000_000)
    expect(bal.get('4001')).toBe(-5_000_000)
  })

  it('P&L, balance sheet, cash and TB match the boards', () => {
    const pl = profitAndLoss()
    expect(pl.netIncome).toBe(-6_870_000)
    const bs = balanceSheet()
    expect(bs.assets).toBe(17_284_050)
    expect(bs.liabilities).toBe(954_050)
    expect(bs.equity).toBe(16_330_000)
    expect(bs.cash).toBe(14_514_050)
    expect(balances().get('1101')).toBe(12_464_050)
    expect(trialBalanceTotals()).toEqual({ debit: 35_304_050, credit: 35_304_050 })
  })

  it('S0+S1+S3 dashboard figures', () => {
    const s013 = journals.filter((j) => ['S0', 'S1', 'S3'].includes(j.scenario))
    const bal = new Map<string, number>()
    for (const j of s013) for (const l of j.lines) bal.set(l.account, (bal.get(l.account) ?? 0) + l.debit - l.credit)
    const pl = profitAndLoss(bal)
    expect(pl.pendapatanOperasional).toBe(7_300_000)
    expect(pl.revenue).toBe(7_255_000)
    expect(pl.grossProfit).toBe(5_755_000)
    expect(pl.netIncome).toBe(2_755_000)
    expect(trialBalanceTotals(bal)).toEqual({ debit: 19_444_050, credit: 19_444_050 })
  })
})
