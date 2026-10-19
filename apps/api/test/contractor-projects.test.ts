import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import fx from '../../../docs/reports/fixtures/contractor/projects-k.json'
import { connect, migrate } from '../src/db'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createMaterialUsage, createProjectCompletion, createRab, createSurvey, postProjectDocument, upsertContractorProject } from '../src/contractor/service'
import { createItemAdjustment } from '../src/inventory/adjustment'
import * as B from '../src/reports/budget'
import * as K from '../src/reports/contractor'
import { upsertItem } from '../src/sales/service'
import * as D from '../src/reports/dimensions'
import * as F from '../src/reports/financial-statements'
import type { TbAccount } from '../src/reports/trial-balance'

// Kontraktor Demo (ADR-0035): NL-K journals and Per Proyek Anggaran of 2047 replayed into a fresh schema; project
// reports compared to Accurate's rows. Kontraktor prints the standard statement (STANDARD style), not Retail's.
const url = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:northline@localhost:55432/northline'
const schema = `kproj_${process.pid}`
const { client, db } = connect(`${url}?options=-c%20search_path%3D${schema}`)
let accounts: TbAccount[], lines: D.DimLine[], budgets: B.BudgetLine[], kps: K.Project[]
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
  await replayContractor()
  kps = await K.loadContractor(db)
})

/** PRC.2026.06.00001 (ADR-0038) through the commands: project, RAB, opening stock, project-linked documents (sales invoices
 * by billing share), MEQ, surveys, FPC. Journals the commands derive (cost entries, MEQ, FPC) are not taken from the fixture. */
async function replayContractor() {
  const k = fx.contractor, p = k.project, n = Number
  await db.execute(sql`INSERT INTO warehouses (name) VALUES (${p.warehouse})`)
  for (const i of k.items) await upsertItem(db, { no: i.no, name: i.name, type: i.type as any, unit: i.unit ?? '-', salesAccount: p.incomeAccount,
    ...(i.type === 'INVENTORY' ? { inventoryAccount: i.inventoryAccount, cogsAccount: p.cogsAccount } : { expenseAccount: i.inventoryAccount }) })
  await upsertContractorProject(db, { no: p.no, name: p.name, manager: p.manager, targetStart: p.targetStart, finishDate: p.finishDate, description: p.description,
    warehouse: p.warehouse, wipAccount: p.wipAccount, cogsAccount: p.cogsAccount, incomeAccount: p.incomeAccount })
  await createRab(db, { idempotencyKey: `k-${k.rab.number}`, number: k.rab.number, project: p.no, date: k.rab.date, feePct: n(k.rab.feePct),
    groups: k.rab.groups.map(g => ({ number: g.number, name: g.name, tasks: g.tasks.map(t => ({ name: t.name, volume: n(t.volume), unit: t.unit.name, bufferPct: n(t.bufferPct),
      startDate: t.startDate, endDate: t.endDate, resources: t.resources.map(r => ({ item: r.item, name: r.name, unit: r.unit, qty: n(r.qty), unitCost: n(r.unitCost) })) })) })) })
  // the IA.* opening adjustments are dated 20 Jun, after the May MEQ that consume them (notes.stockDates): replayed first, dated before the project
  for (const o of k.opening) await createItemAdjustment(db, { idempotencyKey: `k-${o.number}`, number: o.number, date: '2026-05-01', description: o.description, account: o.offsetAccount,
    lines: [{ item: o.item, direction: 'IN', qty: n(o.qty), unitCost: n(o.unitCost) }] })
  const SOURCE = { PI: 'PI', PPY: 'PP', PAY: 'OP', SID: 'SDP', SI: 'SI', RCPT: 'SR' } as const
  for (const d of k.documents as any[]) {
    const bill = k.billing.find(b => b.invoice === d.number)
    await postProjectDocument(db, { idempotencyKey: `k-${d.number}`, number: d.number, sourceType: SOURCE[d.type as keyof typeof SOURCE], date: d.date, description: d.description, project: p.no,
      // a billing invoice's cost entry (Dr COGS / Cr WIP) is derived from its share, so the fixture's copy is left out
      lines: d.journal.filter((l: any) => !(bill && [p.cogsAccount, p.wipAccount].includes(l.account))).map((l: any) => ({ account: l.account, side: l.side, amount: n(l.amount) })),
      costs: [...(d.lines ?? []).filter((l: any) => l.resource).map((l: any) => ({ task: l.task, resource: l.resource, name: l.resource, qty: l.qty === undefined ? undefined : n(l.qty), amount: n(l.amount) })),
        ...(d.expenses ?? []).map((e: any) => ({ name: e.accountName, qty: 1, amount: n(e.amount) }))],
      billing: bill && { groups: bill.groups, sharePct: n(bill.sharePct) } })
  }
  for (const m of k.meq) await createMaterialUsage(db, { idempotencyKey: `k-${m.number}`, number: m.number, project: p.no, date: m.date, description: m.description,
    lines: m.lines.map(l => ({ task: l.task, resource: l.resource, item: l.item, qty: n(l.qty), warehouse: l.warehouse })) })
  for (const v of k.surveys) await createSurvey(db, { idempotencyKey: `k-${v.number}`, number: v.number, project: p.no, date: v.date, surveyor: v.surveyor, description: v.description,
    lines: v.lines.map(l => ({ task: l.task, progressQty: n(l.progressQty) })) })
  await createProjectCompletion(db, { idempotencyKey: `k-${k.fpc.number}`, number: k.fpc.number, project: p.no, date: k.fpc.date, description: k.fpc.description,
    returns: k.fpc.returns.map(r => ({ item: r.item, qty: n(r.qty), warehouse: r.warehouse })) })
  await catchUp(db, ledgerProjection)
}
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
  const { createFullUser } = await import('./fixture-db')
  const app = createApp(db)
  // the route loads the ledger, which needs settings; values do not affect P&L rows
  await db.execute(sql`INSERT INTO ledger_settings (retained_earnings_account, fiscal_year_start_month) VALUES ('300002', 1)`)
  await createFullUser(db, 'nl-k@example.test', 'rahasia-123')
  const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nl-k@example.test', password: 'rahasia-123' }) })
  const cookie = login.headers.get('set-cookie')!.split(';')[0]!
  const get = async (p: string) => (await app.request('/api' + p, { headers: { cookie } })).json()
  expect(await get('/reports/dimensions/by-project?from=2047-01-01&to=2047-12-31&project=NL-K-P1&project=NL-K-P2&style=standard')).toEqual(body(R.ProfitLossByProjectReport!.rows))
  expect(await get('/reports/dimensions/project-multi-period?from=2047-01-01&to=2047-04-30&project=NL-K-P1&style=standard')).toEqual(body(R.ProfitLossProjectMultiPeriodReport!.rows))
  expect(await get('/reports/dimensions/analysis-project?from=2047-01-01&to=2047-12-31')).toEqual(body(R.AnalysisProfitLossProjectReport!.rows))
  expect(await get('/reports/master/projects')).toEqual(body(R.ProjectListReport!.rows))
  // company report style STANDARD (ADR-0037): no style= needed; style=retail still overrides
  await db.execute(sql`UPDATE ledger_settings SET report_style = 'STANDARD'`)
  expect(await get('/reports/dimensions/by-project?from=2047-01-01&to=2047-12-31&project=NL-K-P1&project=NL-K-P2')).toEqual(body(R.ProfitLossByProjectReport!.rows))
  expect(await get('/reports/dimensions/by-project?from=2047-01-01&to=2047-12-31&project=NL-K-P1&project=NL-K-P2&style=retail')).not.toEqual(body(R.ProfitLossByProjectReport!.rows))
})

// ---- Proyek Kontraktor (ADR-0038): PRC.2026.06.00001 against captures/contractor/<planId>.json ----
const KCAP = (id: string) => require(`../../../docs/reports/captures/contractor/${id}.json`) as { param: any; rows: string[][] }
const FOOT = /^(ACCURATE Accounting|Tercetak pada|Halaman )/
/** Per page: rows above the table header (titles, parameter echo) and footers out; the header kept once. */
function paged(rows: string[][], head: string): string[][] {
  const out: string[][] = []
  let inPage = false, seen = false
  for (const r of rows) {
    if (FOOT.test(r[0]!)) { inPage = false; continue }
    if (!inPage) { if (r[0] === head) { inPage = true; if (!seen) out.push(r), (seen = true) } continue }
    out.push(r)
  }
  return out
}
/** Accurate dumps a header block with empty cells as single-cell runs (labels, colons, values per column); rebuilt as label : value rows. */
function unscramble(rows: string[][]): string[][] {
  const out: string[][] = []
  for (let i = 0; i < rows.length;) {
    let j = i; while (j < rows.length && rows[j]!.length === 1) j++
    const run = rows.slice(i, j).map(r => r[0]!), cols: { labels: string[]; vals: string[] }[] = []
    let k = 0, ok = run.length > 0
    while (ok && k < run.length) {
      const labels: string[] = []; while (k < run.length && run[k] !== ':') labels.push(run[k++]!)
      let colons = 0; while (k < run.length && run[k] === ':') { colons++; k++ }
      ok = labels.length > 0 && colons === labels.length && k + colons <= run.length
      if (ok) { cols.push({ labels, vals: run.slice(k, k + colons) }); k += colons }
    }
    if (ok) for (let r = 0; r < cols[0]!.labels.length; r++) out.push(cols.flatMap(c => r < c.labels.length ? [c.labels[r]!, ':', c.vals[r]!] : []))
    else out.push(...rows.slice(i, Math.max(j, i + 1)))
    i = Math.max(j, i + 1)
  }
  return out
}
/** Detail reports print one document per page: only the titles and footers are furniture. */
const detail = (rows: string[][], title: string) =>
  unscramble(rows.filter(r => !FOOT.test(r[0]!) && !/^(PT Solar Energy Indonesia$|Dari \d|Cabang : )/.test(r[0]!) && r[0] !== title))
/** Only the mismatching rows, so a failure names the line. */
const diff = (got: string[][], want: string[][]) =>
  Array.from({ length: Math.max(got.length, want.length) }, (_, i) => [i, got[i], want[i]] as const).filter(([, g, w]) => JSON.stringify(g) !== JSON.stringify(w))
/** Order among one task's MEQ lines is not determined: both captured tasks print the reverse of entry order, which equally fits
 * item number or name descending (2 samples). Lines sorted by name within each task on both sides. */
const settle = (rows: string[][]) => {
  const out = rows.map(r => [...r]), isLine = (r: string[]) => r.length === 4 && r[1] !== 'Kuantitas'
  for (let i = 0; i < out.length;) {
    let k = i; while (k < out.length && isLine(out[k]!)) k++
    if (k > i) out.splice(i, k - i, ...out.slice(i, k).sort((a, b) => a[0]!.localeCompare(b[0]!)))
    i = Math.max(k, i + 1)
  }
  return out
}
const kfrom = '2000-01-01', kto = '2040-12-31', PRC = 'PRC.2026.06.00001'

test('Proyek Kontraktor: RAB totals and cost entries follow ADR-0038', () => {
  const t = K.rabTotals(K.byNo(kps, PRC).rab!), e = fx.contractor.expected
  expect([t.work, t.buffer, t.grand]).toEqual([e.workTotal, e.bufferTotal, e.grandTotal].map(cents))
  const wip = K.byNo(kps, PRC).journal.filter(l => l.account === '110506')
  expect(wip.filter(l => l.sourceType === 'SI').map(l => l.credit)).toEqual(fx.contractor.billing.map(b => cents(b.costEntryAmount)))
  expect([wip.reduce((s, l) => s + l.debit, 0), wip.reduce((s, l) => s + l.credit, 0)]).toEqual([cents(e.wip110506Debit), cents(e.wip110506Credit)])
})

const kcases: [string, () => string[][], (rows: string[][]) => string[][]][] = [
  ['ProjectContractorListReport', () => K.projectContractorList(kps, kfrom, kto), r => paged(r, 'No. Proyek')],
  ['ContractorBudgetPlanReport', () => K.contractorBudgetPlan(kps, kfrom, kto), r => paged(r, 'Tanggal')],
  ['ProjectBudgetComparisonReport', () => K.projectBudgetComparison(K.byNo(kps, PRC)), r => paged(r, 'Bahan Baku dan Biaya')],
  ['ProjectContractorJournalReport', () => K.projectContractorJournal(K.byNo(kps, PRC)), r => paged(r, 'Tanggal')],
  ['MaterialEquipmentReport', () => K.materialEquipmentList(kps, kfrom, kto), r => paged(r, 'Tanggal')],
  ['MaterialEquipmentDetailReport', () => settle(K.materialEquipmentDetail(kps, kfrom, kto)), r => settle(detail(r, 'Rincian Bahan Baku Terpakai'))],
  ['SurveyListReport', () => K.surveyList(kps, kfrom, kto), r => paged(r, 'Tanggal')],
  ['ContractorSurveyDetailReport', () => K.contractorSurveyDetail(kps, kfrom, kto), r => detail(r, 'Rincian Survei Proyek')],
  ['ProjectContractorProgressReport', () => K.projectContractorProgress(K.byNo(kps, PRC), kto), r => paged(r, 'Uraian Pekerjaan')],
  ['BankMutationByProjectContractorReport', () => K.bankMutationByProjectContractor(K.byNo(kps, PRC)), r => paged(r, 'Tanggal')],
]
for (const [id, run, strip] of kcases)
  test(`Proyek Kontraktor: ${id} equals the Kontraktor Demo capture`, () => { expect(diff(run(), strip(KCAP(id).rows))).toEqual([]) })

test('Proyek Kontraktor: ProfitLossByProjectContractorReport (capture is the error page; totals per spec)', () => {
  expect(JSON.stringify(KCAP('ProfitLossByProjectContractorReport'))).toContain('Proyek harus diisi')
  expect(() => K.profitLossByProjectContractor(accounts, kps, [], kfrom, kto, o)).toThrow('Proyek harus diisi')
  const rows = K.profitLossByProjectContractor(accounts, kps, [PRC], kfrom, kto, o)
  // spec (AnalysisProfitLossProjectReport capture): Pendapatan 196.066.600, BPP 168.395.700, Laba 27.670.900
  const at = (label: string) => rows.find(r => r[0] === label)
  expect([at('Jumlah Pendapatan'), at('Jumlah Beban Pokok Penjualan'), at('LABA BERSIH')]).toEqual([
    ['Jumlah Pendapatan', '196.066.600', '196.066.600'], ['Jumlah Beban Pokok Penjualan', '168.395.700', '168.395.700'], ['LABA BERSIH', '27.670.900', '27.670.900']])
})

test('Proyek Kontraktor HTTP: routes serve the same rows; FPC once per project', async () => {
  const { createApp } = await import('../src/app')
  const { createFullUser } = await import('./fixture-db')
  const app = createApp(db)
  await createFullUser(db, 'nl-kc@example.test', 'rahasia-123')
  const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nl-kc@example.test', password: 'rahasia-123' }) })
  const cookie = login.headers.get('set-cookie')!.split(';')[0]!
  const get = async (p: string) => (await app.request('/api/reports/contractor/' + p, { headers: { cookie } })).json()
  expect(await get(`journal?project=${PRC}`)).toEqual(K.projectContractorJournal(K.byNo(kps, PRC)))
  expect(await get(`budget-plan?from=${kfrom}&to=${kto}`)).toEqual(paged(KCAP('ContractorBudgetPlanReport').rows, 'Tanggal'))
  expect(await get(`progress?project=${PRC}&asOf=${kto}`)).toEqual(paged(KCAP('ProjectContractorProgressReport').rows, 'Uraian Pekerjaan'))
  expect(await get(`profit-loss?from=${kfrom}&to=${kto}`)).toEqual({ error: 'Proyek harus diisi' })
  await expect(createProjectCompletion(db, { idempotencyKey: 'k-FPC-again', project: PRC, date: '2026-07-02' })).rejects.toThrow('sudah selesai')
})
