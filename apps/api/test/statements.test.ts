import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import fs from '../../../docs/reports/fixtures/financial-statements.json'
import * as F from '../src/reports/financial-statements'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => { f = await fixtureDb('st') })
afterAll(() => f.close())
const o = { showZeroBalance: false, showParentAccount: true }
const load = async () => {
  const accounts = (await f.db.execute(sql`SELECT no, name, type, parent_no FROM accounts`)).map(r => ({ no: r.no as string, name: r.name as string, type: r.type as any, parentNo: (r.parent_no as string) ?? null }))
  const balances = (await f.db.execute(sql`SELECT account_no, to_char(date,'YYYY-MM-DD') AS date, debit, credit FROM account_daily_balances`))
    .map(r => ({ account: r.account_no as string, date: r.date as string, debit: Number(r.debit), credit: Number(r.credit) }))
  return { accounts, balances, settings: { retainedEarningsAccount: '300002', fiscalYearStartMonth: 1 } }
}

test('Laba/Rugi (Kuartal) per 2031', async () => {
  const { accounts, balances } = await load()
  const qs = F.quarters(2031)
  const head = ['Deskripsi', ...qs.map(q => `${q.label} (IDR)`), 'Total (IDR)']
  expect([head, ...F.profitLossColumns(accounts, balances, qs, o).map(F.formatMulti)]).toEqual(fs.ProfitLossQuarterReport.rows)
})

test('Neraca (Multi Year) per 2032: year ends 2030–2032', async () => {
  const { accounts, balances, settings } = await load()
  const ys = [2030, 2031, 2032]
  expect(['Deskripsi', ...ys.map(y => `${y} (IDR)`)]).toEqual(fs.BalanceSheetMultiYearReport.header)
  const rows = F.balanceSheetColumns(accounts, balances, settings, ys.map(y => `${y}-12-31`), o).map(F.formatMulti).filter(r => /^NL-T1|^Laba Tahun/.test(r[0]!))
  expect(rows).toEqual(fs.BalanceSheetMultiYearReport.rows.filter(r => /^NL-T1|^Laba Tahun/.test(r[0]!)))
})

test('Neraca (Perbandingan Periode) 31 Des 2030 vs 28 Feb 2031', async () => {
  const { accounts, balances, settings } = await load()
  const [a, b] = ['2030-12-31', '2031-02-28']
  expect(['Deskripsi', F.perDateEn(a), F.perDateEn(b), 'Variance', '% Var.']).toEqual(fs.BalanceSheetComparePeriodReport.header)
  const bs = (d: string) => F.balanceSheet(accounts, balances, settings, d, { ...o, showZeroBalance: true })
  const rows = F.compareColumns(bs(a), bs(b), o).map(F.formatMulti).filter(r => /^NL-T1|^Laba Tahun/.test(r[0]!))
  expect(rows).toEqual(fs.BalanceSheetComparePeriodReport.rows.filter(r => /^NL-T1|^Laba Tahun/.test(r[0]!)))
})
