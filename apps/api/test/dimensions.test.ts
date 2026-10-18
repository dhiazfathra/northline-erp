import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import fx from '../../../docs/reports/fixtures/retail/dimensions-ra.json'
import { connect, migrate } from '../src/db'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import * as D from '../src/reports/dimensions'
import type { TbAccount } from '../src/reports/trial-balance'

// Retail Demo (ADR-0022): the NL-RA journals of 2041 replayed into a fresh schema; reports compared to Accurate's rows.
const url = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:northline@localhost:55432/northline'
const schema = `dim_${process.pid}`
const { client, db } = connect(`${url}?options=-c%20search_path%3D${schema}`)
let accounts: TbAccount[], lines: D.DimLine[]
const o = { showZeroBalance: false, showParentAccount: true }
const R = fx.reports as Record<string, { param: any; rows: string[][] }>

beforeAll(async () => {
  await client.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema}`)
  await migrate(client)
  // parents first so OpenAccount finds them
  const depth = (no: string | null): number => (no ? 1 + depth(fx.accounts.find(a => a.no === no)!.parentNo) : 0)
  for (const a of [...fx.accounts].sort((x, y) => depth(x.parentNo) - depth(y.parentNo)))
    await handle(db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any, parentNo: a.parentNo ?? undefined })
  await catchUp(db, ledgerProjection)
  await db.execute(sql`UPDATE branches SET is_default = false`)
  for (const b of fx.branches) await db.execute(sql`INSERT INTO branches (name, is_default) VALUES (${b.name}, ${!!b.default})`)
  for (const d of fx.departments) await db.execute(sql`INSERT INTO departments (name, description) VALUES (${d.name}, ${d.description ?? ''})`)
  for (const p of fx.projects) await db.execute(sql`INSERT INTO projects (name, no) VALUES (${p.name}, ${p.no})`)
  for (const j of fx.journals)
    await handle(db, { type: 'PostJournal', idempotencyKey: `nl-ra-${j.ref}`, journalId: crypto.randomUUID(), date: j.date, description: j.description, branch: j.branch,
      lines: j.lines.map(l => ({ ...l, side: l.side as 'DEBIT' | 'CREDIT' })) })
  await catchUp(db, ledgerProjection)
  accounts = fx.accounts.map(a => ({ no: a.no, name: a.name, type: a.type as any, parentNo: a.parentNo }))
  lines = await D.loadDimLines(db)
})
afterAll(async () => { await client.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await client.end() })

/** Accurate's page furniture out: title lines above each page's header row, the footer, and repeated headers. */
function body(rows: string[][]): string[][] {
  const out: string[][] = []
  let header: string[] | null = null, inPage = false
  for (const r of rows) {
    if (/^(ACCURATE Accounting|Tercetak pada|Halaman )/.test(r[0]!)) { inPage = false; continue }
    if (!inPage) { if (/^(Deskripsi|Nama)/.test(r[0]!)) { inPage = true; if (!header) out.push((header = r)) } continue }
    out.push(r)
  }
  return out
}
const iso = (d: string) => d.split('/').reverse().join('-')

test('Laba/Rugi Cabang 2041: JAKARTA, SURABAYA, Total', () => {
  const p = R.ProfitLossByBranchReport!.param
  expect(D.profitLossByBranch(accounts, lines, ['JAKARTA', 'SURABAYA'], 'JAKARTA', iso(p.startDate), iso(p.endDate), o)).toEqual(body(R.ProfitLossByBranchReport!.rows))
})

test('Laba/Rugi Departemen 2041: NL-RA-D1, NL-RA-D2 (lines without department left out)', () => {
  const p = R.ProfitLossByDepartmentReport!.param
  expect(D.profitLossByDepartment(accounts, lines, p.selectedDepartment.map((d: any) => d.name), iso(p.startDate), iso(p.endDate), o)).toEqual(body(R.ProfitLossByDepartmentReport!.rows))
})

test('Laba/Rugi Departemen (Multi Periode) Jan-Des 2041, NL-RA-D1', () => {
  const p = R.ProfitLossDepartmentMultiPeriodReport!.param
  expect(D.profitLossDepartmentMultiPeriod(accounts, lines, p.selectedDepartment[0].name, p.periodStartYear, p.periodStartMonth, p.periodEndYear, p.periodEndMonth, o))
    .toEqual(body(R.ProfitLossDepartmentMultiPeriodReport!.rows))
})

for (const [planId, dim, key] of [['ProfitLossComparePeriodPerDepartmentReport', 'department', 'selectedDepartment'], ['ProfitLossComparePeriodPerProjectReport', 'project', 'selectedProject']] as const)
  test(`${planId}: Q1 vs Apr-Des 2041`, () => {
    const p = R[planId]!.param
    expect(D.profitLossComparePeriodBy(accounts, lines, dim, p[key][0].name, { from: iso(p.startDate), to: iso(p.endDate) }, { from: iso(p.startDateCompare), to: iso(p.endDateCompare) }, o))
      .toEqual(body(R[planId]!.rows))
  })

test('Analisa Laba/Rugi Departemen 2041 incl. [Tanpa Departement]', () => {
  const p = R.AnalysisProfitLossDepartmentReport!.param
  expect(D.analysisProfitLossDepartment(accounts, lines, iso(p.startDate), iso(p.endDate))).toEqual(body(R.AnalysisProfitLossDepartmentReport!.rows))
})

test('Daftar Departemen', async () => {
  expect(await D.departmentList(db)).toEqual(body(R.DepartmentListReport!.rows))
})

test('unknown department is rejected', async () => {
  const j = fx.journals[0]!
  await expect(handle(db, { type: 'PostJournal', idempotencyKey: 'nl-ra-bad-dept', journalId: crypto.randomUUID(), date: j.date, description: 'x',
    lines: j.lines.map(l => ({ ...l, side: l.side as 'DEBIT' | 'CREDIT', department: 'NOPE' })) })).rejects.toThrow('Departemen tidak dikenal')
})
