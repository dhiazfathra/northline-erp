import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import cf from '../../../docs/reports/fixtures/cash-flow.json'
import { cashFlowDirect, cashFlowIndirect } from '../src/reports/cash-flow'
import { loadJournals } from '../src/reports/queries'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => { f = await fixtureDb('cf') })
afterAll(() => f.close())
const load = async () => {
  const accounts = (await f.db.execute(sql`SELECT no, name, type, parent_no FROM accounts`)).map(r => ({ no: r.no as string, name: r.name as string, type: r.type as any, parentNo: (r.parent_no as string) ?? null }))
  const balances = (await f.db.execute(sql`SELECT account_no, to_char(date,'YYYY-MM-DD') AS date, debit, credit FROM account_daily_balances`))
    .map(r => ({ account: r.account_no as string, date: r.date as string, debit: Number(r.debit), credit: Number(r.credit) }))
  return { accounts, balances }
}
const fmt = (c: number) => (c < 0 ? '-' : '') + Math.floor(Math.abs(c) / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (Math.abs(c) % 100 ? ',' + String(Math.abs(c) % 100).padStart(2, '0').replace(/0+$/, '') : '')
const idr = (s: string) => Math.round(Number(s.replace(/\./g, '').replace(',', '.')) * 100)
// sandbox cash outside the fixture appears in the opening/closing cash rows only
const adjust = (rows: string[][]) => rows.map(r => /^Kas & Setara Kas di/.test(r[0]!) ? [r[0]!, fmt(idr(r[1]!) - cf.offsets.cash * 100)] : r)

test('Arus Kas (Tak Langsung) Des 2030 – Feb 2031', async () => {
  const { accounts, balances } = await load()
  expect(cashFlowIndirect(accounts, balances, cf.CashFlowIndirectReport.from, cf.CashFlowIndirectReport.to)).toEqual(adjust(cf.CashFlowIndirectReport.rows))
})

test('Arus Kas (Langsung) Des 2030 – Feb 2031', async () => {
  const { accounts, balances } = await load()
  const e = cf.CashFlowDirectReport
  const journals = await loadJournals(f.db, e.from, e.to)
  expect(cashFlowDirect(accounts, balances, journals, e.from, e.to)).toEqual(adjust(e.rows))
})
