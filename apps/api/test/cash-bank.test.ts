import { afterAll, beforeAll, expect, test } from 'bun:test'
import cb from '../../../docs/reports/fixtures/cash-bank.json'
import { queryBankBook, queryCashAccountList, queryCashFlowByAccount } from '../src/reports/queries'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => { f = await fixtureDb('cb') })
afterAll(() => f.close())
const q = (from: string, to: string) => ({ from, to, showZeroBalance: false, showParentAccount: true })

test('Histori Bank NL-T1 Kas Jan–Feb 2031', async () => {
  const e = cb.BankBookReport
  // the bank filter line ("Bank : NL-T1 Kas") is page chrome, printed above the table
  expect([['Bank : NL-T1 Kas'], ...await queryBankBook(f.db, [e.bank], q(e.from, e.to))]).toEqual(e.rows)
})

test('Arus Kas per Akun NL-T1 Kas Jan–Feb 2031', async () => {
  const e = cb.CashFlowbyAccountReport
  expect([['Bank : NL-T1 Kas'], ...await queryCashFlowByAccount(f.db, [e.bank], q(e.from, e.to))]).toEqual(e.rows)
})

test('Daftar Kas per 28 Feb 2031 (IDR block)', async () => {
  const e = cb.CashBankAccountListReport
  const rows = await queryCashAccountList(f.db, e.asOf)
  expect(rows.slice(0, 2)).toEqual([e.header, e.currencyHeading])
  expect(rows.filter(r => /^NL-T1/.test(r[0]!))).toEqual(e.rows)
})
