// Fills the data block of docs/guide/northline-user-guide.html from the code and the report index, so the customer
// guide cannot list a route or a report that does not exist. Run: bun apps/api/scripts/user-guide.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { createApp } from '../src/app'
import { openApiSpec } from '../src/openapi'
import { PUBLIC_ROUTES, ROUTE_PRIVILEGES, SESSION_ROUTES } from '../src/route-privileges'
import { coverageCounts } from './coverage'

const root = new URL('../../../', import.meta.url)
const read = (p: string) => readFileSync(new URL(p, root), 'utf8')
const HTML = 'docs/guide/northline-user-guide.html'
const assert = (ok: unknown, msg: string) => { if (!ok) throw new Error(`user-guide: ${msg}`) }
const tmpl = (p: string) => p.replace(/:(\w+)(\{[^}]*\})?/g, '{$1}')

// Route table: the same source as /api/openapi.json (ADR-0020); createApp only wires handlers, so no database is needed
const spec = openApiSpec(createApp({} as never))
const routes = Object.entries(spec.paths).flatMap(([path, ops]) => Object.entries(ops).map(([m, op]) => {
  const params = (op as { parameters: { name: string; schema: { enum?: string[] } }[] }).parameters
  const is = (k: string) => k.startsWith(`${m.toUpperCase()} `) && tmpl(k.split(' ')[1]!) === path
  const key = Object.keys(ROUTE_PRIVILEGES).find(is), priv = key ? ROUTE_PRIVILEGES[key] : undefined
  return { m: m.toUpperCase(), p: path, tag: path.split('/')[2] ?? 'api', e: Object.fromEntries(params.filter(x => x.schema.enum).map(x => [x.name, x.schema.enum!])),
    priv: PUBLIC_ROUTES.some(is) ? 'public' : SESSION_ROUTES.some(is) ? 'signed in' : typeof priv === 'string' ? priv : priv ? 'per report' : undefined }
}))

// Direct report endpoints: the privilege map ties a GET route, and each of its {a|b} values, to an Accurate planId
const endpoint = new Map<string, string>()
for (const [key, entry] of Object.entries(ROUTE_PRIVILEGES)) {
  const [method, path] = key.split(' ') as [string, string]
  if (method !== 'GET') continue
  for (const [vals, plan] of typeof entry === 'string' ? [['', entry]] : Object.entries(entry)) {
    const v = vals ? vals.split('/') : []
    let i = 0
    if (!endpoint.has(plan)) endpoint.set(plan, tmpl(path.replace(/:\w+\{[^}]*\}/g, m => v[i++] ?? m)))
  }
}

// Reports whose route is keyed by full access or a menu privilege, so the map above cannot name them: the request that
// returns each one (handler read 2026-10-21; tests call the same report functions)
const QUERY: Record<string, string> = {
  ProfitLossByBranchReport: '/reports/dimensions/by-branch?from=…&to=…&branch=…',
  ProfitLossByDepartmentReport: '/reports/dimensions/by-department?from=…&to=…&department=…',
  ProfitLossDepartmentMultiPeriodReport: '/reports/dimensions/department-multi-period?from=…&to=…&department=…&style=retail',
  ProfitLossComparePeriodPerDepartmentReport: '/reports/dimensions/compare-department?from=…&to=…&compareFrom=…&compareTo=…&department=…&style=retail',
  AnalysisProfitLossDepartmentReport: '/reports/dimensions/analysis-department?from=…&to=…',
  ProfitLossByProjectReport: '/reports/dimensions/by-project?from=…&to=…&project=…&style=standard',
  ProfitLossProjectMultiPeriodReport: '/reports/dimensions/project-multi-period?from=…&to=…&project=…&style=standard',
  ProfitLossComparePeriodPerProjectReport: '/reports/dimensions/compare-project?from=…&to=…&compareFrom=…&compareTo=…&project=…',
  AnalysisProfitLossProjectReport: '/reports/dimensions/analysis-project?from=…&to=…',
  FinancialRatioPerMonthReport: '/reports/financial-ratios?year=…&month=…',
  CashFlowDirectMultiPeriodReport: '/reports/cash-flow/direct?from=…&to=…&monthly=true',
  CashFlowIndirectMultiPeriodReport: '/reports/cash-flow/indirect?from=…&to=…&monthly=true',
  CashFlowDetailIndirectMultiPeriodReport: '/reports/cash-flow/indirect-detail?from=…&to=…&monthly=true',
  ApprovalListReport: '/reports/approvals?from=…&to=…',
  SalesmanListReport: '/reports/master/employees',
  DepartmentListReport: '/reports/master/departments',
  ProjectListReport: '/reports/master/projects',
  ProfitLossByProjectContractorReport: '/reports/contractor/profit-loss?from=…&to=…&project=…',
  ProjectContractorProgressReport: '/reports/contractor/progress?project=…&asOf=…',
  ProjectContractorListReport: '/reports/contractor/project-list?from=…&to=…',
  SurveyListReport: '/reports/contractor/survey-list?from=…&to=…',
  ContractorBudgetPlanReport: '/reports/contractor/budget-plan?from=…&to=…',
  MaterialEquipmentReport: '/reports/contractor/material-usage?from=…&to=…',
  ContractorSurveyDetailReport: '/reports/contractor/survey-detail?from=…&to=…',
  MaterialEquipmentDetailReport: '/reports/contractor/material-usage-detail?from=…&to=…',
  ProjectBudgetComparisonReport: '/reports/contractor/budget-comparison?project=…',
  ProjectContractorJournalReport: '/reports/contractor/journal?project=…',
  BankMutationByProjectContractorReport: '/reports/contractor/bank-mutation?project=…',
}
// Same figures as Accurate's report, in another layout (the download, Skontro or chart-point variant is not routed)
const SAME: Record<string, string> = {
  BalanceSheetParentScontroReport: '/reports/balance-sheet?asOf=…',
  AllJournalDownloadReport: '/reports/general-ledger/all-journals?from=…&to=…',
  GeneralLedgerHistoryDownloadReport: '/reports/general-ledger/history?from=…&to=…',
  GeneralLedgerDetailDownloadReport: '/reports/general-ledger/detail?from=…&to=…',
  JournalDetailListDownloadReport: '/reports/general-ledger/account-journal-detail?from=…&to=…',
  SalesInvoiceChartReport: '/reports/charts/monthly-sales?from=…&to=…',
  InventoryValuationDetailDownloadReport: '/reports/inventory/valuation-detail?item=…&from=…&to=…',
}

// Report catalog: docs/reports/_coverage.md is the source of truth; view and date parameter where README.md captured them
const meta = new Map(read('docs/reports/README.md').split('\n').filter(l => /^\| [^|]+ \| `\w+` \|/.test(l))
  .map(l => { const c = l.split(' | '); return [c[1]!.replaceAll('`', ''), [c[2]!, c[3]!]] as const }))
const reports = read('docs/reports/_coverage.md').split('\n').filter(l => l.startsWith('| [')).map(l => {
  const c = l.split(' | '), plan = c[1]!.replaceAll('`', ''), [view, date] = meta.get(plan) ?? []
  const api = endpoint.get(plan) ?? QUERY[plan], same = api ? undefined : SAME[plan]
  return { n: c[0]!.match(/\[(.+)\]\(/)![1]!, id: plan, g: c[2]!, ok: c[9] === 'done', view, date, api: api && `/api${api.replace(/^\/api/, '')}`, same: same && `/api${same}` }
})

const counts = coverageCounts()
assert(reports.length === counts.total, `${reports.length} reports parsed, coverage counts ${counts.total}`)
assert(reports.filter(r => r.ok).length === counts.done, 'done count differs from coverage.ts')
assert(routes.length === Object.values(spec.paths).reduce((n, ops) => n + Object.keys(ops).length, 0), 'route count')
const gets = routes.filter(r => r.m === 'GET').map(r => new RegExp(`^${r.p.replace(/\{\w+\}/g, '[^/]+')}$`))
const ids = new Set(reports.map(r => r.id))
for (const id of [...Object.keys(QUERY), ...Object.keys(SAME)]) assert(ids.has(id), `${id} is not in the coverage table`)
for (const r of reports) for (const u of [r.api, r.same]) if (u) assert(gets.some(re => re.test(u.split('?')[0]!)), `${r.id} -> ${u} is not a GET route`)

const data = { generated: new Date().toISOString().slice(0, 10), counts, reports, routes }
const html = read(HTML)
const re = /(<script id="data" type="application\/json">)[\s\S]*?(<\/script>)/
assert(re.test(html), `no data block in ${HTML}`)
writeFileSync(new URL(HTML, root), html.replace(re, (_, a, b) => a + JSON.stringify(data).replaceAll('<', '\\u003c') + b))
console.log(`${HTML}: ${reports.length} reports (${counts.done} verified, ${reports.filter(r => r.api).length} with an endpoint, ${reports.filter(r => r.same).length} same data in another layout), ${routes.length} API operations`)
