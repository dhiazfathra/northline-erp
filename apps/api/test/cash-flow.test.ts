import { afterAll, beforeAll, expect, test } from 'bun:test'
import cf from '../../../docs/reports/fixtures/cash-flow.json'
import { queryCashFlow, type CashFlowReport } from '../src/reports/queries'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => { f = await fixtureDb('cf') })
afterAll(() => f.close())

const fmt = (c: number) => (c < 0 ? '-' : '') + Math.floor(Math.abs(c) / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (Math.abs(c) % 100 ? ',' + String(Math.abs(c) % 100).padStart(2, '0').replace(/0+$/, '') : '')
const idr = (s: string) => Math.round(Number(s.replace(/\./g, '').replace(',', '.')) * 100)
// sandbox cash outside the fixture appears only in the opening/closing cash rows
const adjust = (rows: string[][]) => rows.map(r => /^Kas & Setara Kas di/.test(r[0]!) ? [r[0]!, ...r.slice(1).map(v => fmt(idr(v) - cf.offsets.cash * 100))] : r)

const cases: [keyof typeof cf, CashFlowReport, boolean][] = [
  ['CashFlowIndirectReport', 'indirect', false], ['CashFlowDirectReport', 'direct', false], ['CashFlowDetailIndirectReport', 'indirect-detail', false],
  ['CashFlowIndirectMultiPeriodReport', 'indirect', true], ['CashFlowDirectMultiPeriodReport', 'direct', true], ['CashFlowDetailIndirectMultiPeriodReport', 'indirect-detail', true],
]
for (const [planId, report, monthly] of cases)
  test(`${planId} Des 2030 – Feb 2031`, async () => {
    const e = cf[planId] as { from: string; to: string; rows: string[][] }
    expect(await queryCashFlow(f.db, report, { from: e.from, to: e.to, showZeroBalance: false, showParentAccount: true }, monthly)).toEqual(adjust(e.rows))
  })
