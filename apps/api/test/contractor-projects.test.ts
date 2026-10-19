import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import fx from '../../../docs/reports/fixtures/contractor/projects-k.json'
import { connect, migrate } from '../src/db'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import * as B from '../src/reports/budget'
import * as D from '../src/reports/dimensions'
import * as F from '../src/reports/financial-statements'
import type { TbAccount } from '../src/reports/trial-balance'

// Kontraktor Demo (ADR-0035): NL-K journals and Per Proyek Anggaran of 2047 replayed into a fresh schema; project
// reports compared to Accurate's rows. Kontraktor prints the standard statement (STANDARD style), not Retail's.
const url = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:northline@localhost:55432/northline'
const schema = `kproj_${process.pid}`
const { client, db } = connect(`${url}?options=-c%20search_path%3D${schema}`)
let accounts: TbAccount[], lines: D.DimLine[], budgets: B.BudgetLine[]
const o = { showZeroBalance: false, showParentAccount: true }
const R = fx.reports as Record<string, { param: any; rows: string[][] }>
const cents = (s: string) => Math.round(Number(s) * 100)
const iso = (d: string) => d.split('/').reverse().join('-')

beforeAll(async () => {
  await client.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema}`)
  await migrate(client)
  const depth = (no: string | null): number => (no ? 1 + depth(fx.accounts.find(a => a.no === no)!.parentNo) : 0)
  for (const a of [...fx.accounts].sort((x, y) => depth(x.parentNo) - depth(y.parentNo)))
    await handle(db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any, parentNo: a.parentNo ?? undefined })
  await catchUp(db, ledgerProjection)
  for (const p of fx.projects) await db.execute(sql`INSERT INTO projects (name, no, description) VALUES (${p.name}, ${p.no}, ${p.description})`)
  for (const j of fx.journals)
    await handle(db, { type: 'PostJournal', idempotencyKey: `nl-k-${j.ref}`, journalId: crypto.randomUUID(), date: j.date, description: j.description,
      lines: j.lines.map(l => ({ ...l, side: l.side as 'DEBIT' | 'CREDIT' })) })
  await catchUp(db, ledgerProjection)
  for (const b of fx.budgets) {
    const [{ id }] = (await db.execute(sql`INSERT INTO budgets (year, month, project, notes) VALUES (${b.year}, ${b.month}, ${b.project}, ${b.notes}) RETURNING id`)) as any
    for (const l of b.lines) await db.execute(sql`INSERT INTO budget_lines (budget_id, account_no, amount) VALUES (${id}, ${l.account}, ${cents(l.amount)})`)
  }
  accounts = fx.accounts.map(a => ({ no: a.no, name: a.name, type: a.type as any, parentNo: a.parentNo }))
  lines = await D.loadDimLines(db)
  budgets = await B.loadBudgetLines(db)
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

test('Laba/Rugi Proyek 2047: NL-K-P1, NL-K-P2, Total (lines without project left out)', () => {
  const p = R.ProfitLossByProjectReport!.param
  expect(D.profitLossByDim(accounts, lines, 'project', p.selectedProject.map((x: any) => x.name), iso(p.startDate), iso(p.endDate), o, D.STANDARD))
    .toEqual(body(R.ProfitLossByProjectReport!.rows))
})

test('Laba/Rugi Proyek (Multi Periode) Jan-Apr 2047, NL-K-P1', () => {
  const p = R.ProfitLossProjectMultiPeriodReport!.param
  const pr = Array.isArray(p.selectedProject) ? p.selectedProject[0] : p.selectedProject
  expect(D.profitLossMultiPeriodBy(accounts, lines, 'project', pr.name, p.periodStartYear, Number(p.periodStartMonth), p.periodEndYear, Number(p.periodEndMonth), o, D.STANDARD))
    .toEqual(body(R.ProfitLossProjectMultiPeriodReport!.rows))
})

test('Laba/Rugi Proyek (Perbandingan Periode) Q1 vs Apr-Des 2047, NL-K-P1 (Kontraktor style)', () => {
  const p = R.ProfitLossComparePeriodPerProjectReport!.param
  expect(D.profitLossComparePeriodBy(accounts, lines, 'project', p.selectedProject[0].name, { from: iso(p.startDate), to: iso(p.endDate) },
    { from: iso(p.startDateCompare), to: iso(p.endDateCompare) }, o, D.STANDARD)).toEqual(body(R.ProfitLossComparePeriodPerProjectReport!.rows))
})

test('Analisa Laba/Rugi Proyek 2047 incl. [Tanpa Proyek]', async () => {
  const p = R.AnalysisProfitLossProjectReport!.param
  expect(D.analysisProfitLossProject(accounts, lines, await D.loadProjectNos(db), iso(p.startDate), iso(p.endDate))).toEqual(body(R.AnalysisProfitLossProjectReport!.rows))
})

for (const key of ['ProfitLossCompareBudgetProjectReport', 'ProfitLossCompareBudgetProjectReport#P1'])
  test(`Laba/Rugi Proyek (Perbandingan Anggaran): ${key}`, () => {
    const p = R[key]!.param
    const pr = Array.isArray(p.selectedProject) ? p.selectedProject[0] : p.selectedProject
    expect(B.profitLossCompareBudget(accounts, lines, budgets, pr.name, p.periodStartYear, Number(p.periodStartMonth), p.periodEndYear, Number(p.periodEndMonth), o, 'project', D.STANDARD))
      .toEqual(body(R[key]!.rows))
  })

test('Daftar Proyek', async () => {
  expect(await D.projectList(db)).toEqual(body(R.ProjectListReport!.rows))
})

test('Laba/Rugi (Standar) 2047: Journal-only core re-verified on Kontraktor Demo', () => {
  const [head, ...rows] = body(R.ProfitLossStandardReport!.rows)
  expect(head).toEqual(['Deskripsi', F.periodLabel('2047-01-01', '2047-12-31')])
  const balances = lines.map(l => ({ account: l.account, date: l.date, debit: l.debit, credit: l.credit }))
  expect(F.profitLoss(accounts, balances, '2047-01-01', '2047-12-31', o).map(F.formatLine)).toEqual(rows)
})

test('HTTP: project routes serve the same rows (style=standard)', async () => {
  const { createApp } = await import('../src/app')
  const { createUser } = await import('../src/auth')
  const app = createApp(db)
  // the route loads the ledger, which needs settings; values do not affect P&L rows
  await db.execute(sql`INSERT INTO ledger_settings (retained_earnings_account, fiscal_year_start_month) VALUES ('300002', 1)`)
  await createUser(db, 'nl-k@example.test', 'rahasia-123')
  const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nl-k@example.test', password: 'rahasia-123' }) })
  const cookie = login.headers.get('set-cookie')!.split(';')[0]!
  const get = async (p: string) => (await app.request('/api' + p, { headers: { cookie } })).json()
  expect(await get('/reports/dimensions/by-project?from=2047-01-01&to=2047-12-31&project=NL-K-P1&project=NL-K-P2&style=standard')).toEqual(body(R.ProfitLossByProjectReport!.rows))
  expect(await get('/reports/dimensions/project-multi-period?from=2047-01-01&to=2047-04-30&project=NL-K-P1&style=standard')).toEqual(body(R.ProfitLossProjectMultiPeriodReport!.rows))
  expect(await get('/reports/dimensions/analysis-project?from=2047-01-01&to=2047-12-31')).toEqual(body(R.AnalysisProfitLossProjectReport!.rows))
  expect(await get('/reports/master/projects')).toEqual(body(R.ProjectListReport!.rows))
})
