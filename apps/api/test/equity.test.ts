import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import eq from '../../../docs/reports/fixtures/equity.json'
import { ownerEquityChange, retainedEarnings } from '../src/reports/equity'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => { f = await fixtureDb('eq') })
afterAll(() => f.close())

const load = async () => {
  const accounts = (await f.db.execute(sql`SELECT no, name, type, parent_no FROM accounts`)).map(r => ({ no: r.no as string, name: r.name as string, type: r.type as any, parentNo: (r.parent_no as string) ?? null }))
  const balances = (await f.db.execute(sql`SELECT account_no, to_char(date,'YYYY-MM-DD') AS date, debit, credit FROM account_daily_balances`))
    .map(r => ({ account: r.account_no as string, date: r.date as string, debit: Number(r.debit), credit: Number(r.credit) }))
  return { accounts, balances, settings: { retainedEarningsAccount: '300002', fiscalYearStartMonth: 1 } }
}
const idr = (s: string) => Math.round(Number(s.replace(/\./g, '').replace(',', '.')) * 100)
const fmt = (c: number) => (c < 0 ? '-' : '') + Math.floor(Math.abs(c) / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (Math.abs(c) % 100 ? ',' + String(Math.abs(c) % 100).padStart(2, '0').replace(/0+$/, '') : '')
/** Removes the sandbox's unrelated balance from a printed value. */
const minus = (s: string, off: number) => fmt(idr(s) - off * 100)

for (const [k, e] of Object.entries(eq.RetainedEarningReport))
  test(`Laba Ditahan ${k}`, async () => {
    const { accounts, balances, settings } = await load()
    const exp = e.rows.map(r => /^Laba ditahan tahun/.test(r[0]!) ? [r[0]!, minus(r[1]!, eq.offsets.retainedEarningsNatural)] : r)
    expect(retainedEarnings(accounts, balances, settings, e.asOfYear)).toEqual(exp)
  })

for (const [k, e] of Object.entries(eq.OwnerEquityChangedReport))
  test(`Perubahan Ekuitas Pemilik ${k}`, async () => {
    const { accounts, balances, settings } = await load()
    const off = eq.offsets.otherEquityNatural // total sandbox equity outside the fixture, retained earnings included
    const exp = e.rows.map(r => /^Ekuitas [Pp]emilik (awal|Akhir)/.test(r[0]!) ? [r[0]!, minus(r[1]!, off)] : r)
    expect(ownerEquityChange(accounts, balances, settings, e.from, e.to)).toEqual(exp)
  })
