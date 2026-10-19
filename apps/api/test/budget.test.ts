import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import fx from '../../../docs/reports/fixtures/retail/budget-rb.json'
import { connect, migrate } from '../src/db'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import * as B from '../src/reports/budget'
import { loadDimLines, type DimLine } from '../src/reports/dimensions'
import type { TbAccount } from '../src/reports/trial-balance'

// Retail Demo (ADR-0025): NL-RB journals and Anggaran of 2042 replayed into a fresh schema; reports compared to Accurate's rows.
const url = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:northline@localhost:55432/northline'
const schema = `budget_${process.pid}`
const { client, db } = connect(`${url}?options=-c%20search_path%3D${schema}`)
let accounts: TbAccount[], lines: DimLine[], budgets: B.BudgetLine[]
const o = { showZeroBalance: false, showParentAccount: true }
const R = fx.reports as Record<string, { planId: string; param: any; rows: string[][] }>
const cents = (s: string) => Math.round(Number(s) * 100)

beforeAll(async () => {
  await client.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema}`)
  await migrate(client)
  const depth = (no: string | null): number => (no ? 1 + depth(fx.accounts.find(a => a.no === no)!.parentNo) : 0)
  for (const a of [...fx.accounts].sort((x, y) => depth(x.parentNo) - depth(y.parentNo)))
    await handle(db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any, parentNo: a.parentNo ?? undefined })
  await catchUp(db, ledgerProjection)
  for (const d of fx.departments) await db.execute(sql`INSERT INTO departments (name, description) VALUES (${d.name}, ${d.description})`)
  for (const j of fx.journals)
    await handle(db, { type: 'PostJournal', idempotencyKey: `nl-rb-${j.ref}`, journalId: crypto.randomUUID(), date: j.date, description: j.description,
      lines: j.lines.map(l => ({ ...l, side: l.side as 'DEBIT' | 'CREDIT' })) })
  await catchUp(db, ledgerProjection)
  for (const b of fx.budgets) {
    const [{ id }] = (await db.execute(sql`INSERT INTO budgets (year, month, department, notes) VALUES (${b.year}, ${b.month}, ${b.department}, ${b.notes}) RETURNING id`)) as any
    for (const l of b.lines) await db.execute(sql`INSERT INTO budget_lines (budget_id, account_no, amount) VALUES (${id}, ${l.account}, ${cents(l.amount)})`)
  }
  accounts = fx.accounts.map(a => ({ no: a.no, name: a.name, type: a.type as any, parentNo: a.parentNo }))
  lines = await loadDimLines(db)
  budgets = await B.loadBudgetLines(db)
})
afterAll(async () => { await client.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await client.end() })

/** Accurate's page furniture out: title lines above each page's header row, the footer, and repeated headers. */
function body(rows: string[][]): string[][] {
  const out: string[][] = []
  let header: string[] | null = null, inPage = false
  for (const r of rows) {
    if (/^(ACCURATE Accounting|Tercetak pada|Halaman )/.test(r[0]!)) { inPage = false; continue }
    if (!inPage) { if (r[0] === 'Deskripsi') { inPage = true; if (!header) out.push((header = r)) } continue }
    out.push(r)
  }
  return out
}
const period = (p: any) => [p.periodStartYear, Number(p.periodStartMonth), p.periodEndYear, Number(p.periodEndMonth)] as const

for (const key of ['general-2042', 'general-jan-feb'])
  test(`Laba/Rugi (Perbandingan Anggaran) ${key}: all lines vs Umum budgets`, () => {
    expect(B.profitLossCompareBudget(accounts, lines, budgets, null, ...period(R[key]!.param), o)).toEqual(body(R[key]!.rows))
  })

for (const key of ['dept-jan', 'dept-d1-2042', 'dept-2042', 'dept-d2d1-2042'])
  test(`Laba/Rugi Departemen (Perbandingan Anggaran) ${key}: last selected department`, () => {
    const { param, rows } = R[key]!
    const [heading, ...rest] = B.profitLossCompareBudgetDepartment(accounts, lines, budgets, param.selectedDepartment.map((d: any) => d.name), ...period(param), o)
    expect(heading).toEqual(rows.find(r => r[0]!.startsWith('Departemen : '))!)
    expect(rest).toEqual(body(rows))
  })

test('one budget per month and scope', async () => {
  await expect((async () => db.execute(sql`INSERT INTO budgets (year, month, department) VALUES (2042, 1, NULL)`))()).rejects.toThrow("Failed query")
})
