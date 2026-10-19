import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import fx from '../../../docs/reports/fixtures/trade/journal-tp.json'
import { connect, migrate } from '../src/db'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import * as F from '../src/reports/financial-statements'
import * as TB from '../src/reports/trial-balance'

// Trade Portal Demo (ADR-0029): NL-TP journals of 2045 replayed into a fresh schema on Trade Portal's own flat chart of accounts.
const url = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:northline@localhost:55432/northline'
const schema = `trade_${process.pid}`
const { client, db } = connect(`${url}?options=-c%20search_path%3D${schema}`)
let accounts: TB.TbAccount[], balances: TB.DailyBalance[]
const o = { showZeroBalance: false, showParentAccount: true }
const settings = { retainedEarningsAccount: '300002', fiscalYearStartMonth: 1 }
const R = fx.reports as Record<string, { planId: string; param: any; rows: string[][] }>

beforeAll(async () => {
  await client.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema}`)
  await migrate(client)
  const depth = (no: string | null): number => (no ? 1 + depth(fx.accounts.find(a => a.no === no)!.parentNo) : 0)
  for (const a of [...fx.accounts].sort((x, y) => depth(x.parentNo) - depth(y.parentNo)))
    await handle(db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any, parentNo: a.parentNo ?? undefined })
  await catchUp(db, ledgerProjection)
  for (const j of fx.journals)
    await handle(db, { type: 'PostJournal', idempotencyKey: `nl-tp-${j.ref}`, journalId: crypto.randomUUID(), date: j.date, description: j.description,
      lines: j.lines.map(l => ({ ...l, side: l.side as 'DEBIT' | 'CREDIT' })) })
  await catchUp(db, ledgerProjection)
  accounts = fx.accounts.map(a => ({ no: a.no, name: a.name, type: a.type as any, parentNo: a.parentNo }))
  balances = (await db.execute(sql`SELECT account_no, to_char(date,'YYYY-MM-DD') AS date, debit, credit FROM account_daily_balances`))
    .map(r => ({ account: r.account_no as string, date: r.date as string, debit: Number(r.debit), credit: Number(r.credit) }))
})
afterAll(async () => { await client.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await client.end() })

/** Accurate's page furniture out: title lines above each page's header row, the footer, and repeated headers. */
function body(rows: string[][], first: string): string[][] {
  const out: string[][] = []
  let header: string[] | null = null, inPage = false
  for (const r of rows) {
    if (/^(ACCURATE Accounting|Tercetak pada|Halaman )/.test(r[0]!)) { inPage = false; continue }
    if (!inPage) { if (r[0] === first) { inPage = true; if (!header) out.push((header = r)) } continue }
    out.push(r)
  }
  return out
}

test('Laba/Rugi (Standar) 1 Jan - 28 Feb 2045', () => {
  const [head, ...rows] = body(R['pl-jan-feb']!.rows, 'Deskripsi')
  expect(head).toEqual(['Deskripsi', F.periodLabel('2045-01-01', '2045-02-28')])
  expect(F.profitLoss(accounts, balances, '2045-01-01', '2045-02-28', o).map(F.formatLine)).toEqual(rows)
})

test('Laba/Rugi (Multi Periode) Januari-Februari 2045', () => {
  const [, ...rows] = body(R['pl-multi']!.rows, 'Deskripsi')
  expect(F.profitLossColumns(accounts, balances, F.months(2045, 1, 2045, 2), o).map(F.formatMulti)).toEqual(rows)
})

test('Laba/Rugi (Perbandingan Periode) Jan vs Feb 2045', () => {
  const [, ...rows] = body(R['pl-compare']!.rows, 'Deskripsi')
  const pl = (a: string, b: string) => F.profitLoss(accounts, balances, a, b, { ...o, showZeroBalance: true })
  expect(F.compareColumns(pl('2045-01-01', '2045-01-31'), pl('2045-02-01', '2045-02-28'), o).map(F.formatMulti)).toEqual(rows)
})

test('Neraca Percobaan 1 Jan - 28 Feb 2045', () => {
  const [, ...rows] = body(R['tb-jan-feb']!.rows, 'Kode')
  expect(TB.trialBalance(accounts, balances, settings, { from: '2045-01-01', to: '2045-02-28', ...o }).map(TB.formatRow)).toEqual(rows)
})

test('Neraca (Standar) per 28 Feb 2045', () => {
  const [, ...rows] = body(R['bs-feb']!.rows, 'Deskripsi')
  expect(F.balanceSheet(accounts, balances, settings, '2045-02-28', o).map(F.formatLine)).toEqual(rows)
})

test('Neraca (Perbandingan Periode) 31 Des 2044 vs 28 Feb 2045', () => {
  const [head, ...rows] = body(R['bs-compare']!.rows, 'Deskripsi')
  expect(head).toEqual(['Deskripsi', F.perDateEn('2044-12-31'), F.perDateEn('2045-02-28'), 'Variance', '% Var.'])
  const bs = (d: string) => F.balanceSheet(accounts, balances, settings, d, { ...o, showZeroBalance: true })
  expect(F.compareColumns(bs('2044-12-31'), bs('2045-02-28'), o).map(F.formatMulti)).toEqual(rows)
})
