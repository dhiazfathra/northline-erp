import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { compareColumns, mergeColumns, months, periodLabel, profitLoss, type StatementLine, type StatementOptions } from './financial-statements'
import { formatIdr, type AccountType, type DailyBalance, type TbAccount } from './trial-balance'

// Branch / department / project P&L reports (ADR-0022); rules in docs/reports/ProfitLossByBranchReport.md and siblings.
// Retail Demo prints en-US numbers and splits LABA BERSIH into "(Sebelum Pajak)" / "(Setelah Pajak)" (no tax line modelled);
// Kontraktor Demo prints the standard statement (one LABA BERSIH, id-ID numbers): style STANDARD (ADR-0035).

/** One journal line with its dimensions; branch null = the default branch. */
export interface DimLine { account: string; date: string; debit: number; credit: number; branch: string | null; department: string | null; project: string | null }

export async function loadDimLines(db: Db): Promise<DimLine[]> {
  return (await db.execute(sql`SELECT l.account_no, to_char(l.date,'YYYY-MM-DD') AS date, l.debit, l.credit, j.branch, l.department, l.project
    FROM journal_lines l JOIN journals j USING (journal_id)`)).map(r => ({ account: r.account_no as string, date: r.date as string, debit: Number(r.debit), credit: Number(r.credit),
    branch: r.branch as string | null, department: r.department as string | null, project: r.project as string | null }))
}

/** en-US grouping, up to 2 decimals with trailing zeros dropped: `1,650,000.5`. */
export function formatEn(cents: number): string {
  const neg = cents < 0, abs = Math.abs(cents)
  const int = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const frac = String(abs % 100).padStart(2, '0').replace(/0+$/, '')
  return (neg ? '-' : '') + int + (frac ? '.' + frac : '')
}

const balances = (lines: DimLine[]): DailyBalance[] => lines.map(l => ({ account: l.account, date: l.date, debit: l.debit, credit: l.credit }))

/** The standard Laba/Rugi over a subset of lines, with Retail's two LABA BERSIH rows. */
export function pl(accounts: TbAccount[], lines: DimLine[], from: string, to: string, o: StatementOptions): StatementLine[] {
  const out = profitLoss(accounts, balances(lines), from, to, o)
  const net = out.pop()!
  return [...out, { ...net, label: 'LABA BERSIH (Sebelum Pajak)' }, { ...net, label: 'LABA BERSIH (Setelah Pajak)' }]
}

/** How a sandbox prints the dimension statements. */
export interface Style { pl: typeof pl; num: (cents: number) => string }
export const RETAIL: Style = { pl, num: formatEn }
export const STANDARD: Style = { pl: (a, l, f, t, o) => profitLoss(a, balances(l), f, t, o), num: formatIdr }

type Row = { label: string; amounts: number[]; pct?: (number | null)[] }
const fmt = (s: Style) => (l: Row): string[] => [l.label, ...l.amounts.map(s.num), ...(l.pct ?? []).map(p => `${String(p).replace('.', ',')} %`)]
const zeroKept = (o: StatementOptions) => ({ ...o, showZeroBalance: true })

/** Laba/Rugi Cabang: one column per branch, then Total. */
export function profitLossByBranch(accounts: TbAccount[], lines: DimLine[], branches: string[], defaultBranch: string, from: string, to: string, o: StatementOptions) {
  const cols = branches.map(b => pl(accounts, lines.filter(l => (l.branch ?? defaultBranch) === b), from, to, zeroKept(o)))
  return [['Deskripsi', ...branches, 'Total'], ...mergeColumns(cols, o, true).map(fmt(RETAIL))]
}

type Dim = 'department' | 'project'

/** Laba/Rugi Departemen / Proyek: one column per selected value, then Total. Lines without that dimension are left out. */
export function profitLossByDim(accounts: TbAccount[], lines: DimLine[], dim: Dim, values: string[], from: string, to: string, o: StatementOptions, s = RETAIL) {
  const cols = values.map(v => s.pl(accounts, lines.filter(l => l[dim] === v), from, to, zeroKept(o)))
  return [['Deskripsi', ...values, 'Total'], ...mergeColumns(cols, o, true).map(fmt(s))]
}
export const profitLossByDepartment = (accounts: TbAccount[], lines: DimLine[], departments: string[], from: string, to: string, o: StatementOptions) =>
  profitLossByDim(accounts, lines, 'department', departments, from, to, o)

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

/** Laba/Rugi Departemen / Proyek (Multi Periode): one value, one column per month (full month name), then Total. */
export function profitLossMultiPeriodBy(accounts: TbAccount[], lines: DimLine[], dim: Dim, value: string, sy: number, sm: number, ey: number, em: number, o: StatementOptions, s = RETAIL) {
  const ms = months(sy, sm, ey, em), own = lines.filter(l => l[dim] === value)
  const cols = ms.map(m => s.pl(accounts, own, m.from, m.to, zeroKept(o)))
  // shortcut: header verified within one year only; a cross-year range may print the year too.
  return [['Deskripsi', ...ms.map(m => BULAN[Number(m.from.slice(5, 7)) - 1]!), 'Total'], ...mergeColumns(cols, o, true).map(fmt(s))]
}
export const profitLossDepartmentMultiPeriod = (accounts: TbAccount[], lines: DimLine[], department: string, sy: number, sm: number, ey: number, em: number, o: StatementOptions) =>
  profitLossMultiPeriodBy(accounts, lines, 'department', department, sy, sm, ey, em, o)

/** Laba/Rugi Departemen / Proyek (Perbandingan Periode): base, compare, variance, % var. over one dimension value. */
export function profitLossComparePeriodBy(accounts: TbAccount[], lines: DimLine[], dim: Dim, value: string,
  base: { from: string; to: string }, cmp: { from: string; to: string }, o: StatementOptions, s = RETAIL) {
  const own = lines.filter(l => l[dim] === value)
  const rows = compareColumns(s.pl(accounts, own, base.from, base.to, zeroKept(o)), s.pl(accounts, own, cmp.from, cmp.to, zeroKept(o)), o)
  return [['Deskripsi', periodLabel(base.from, base.to), periodLabel(cmp.from, cmp.to), 'Variance', '% Var.'], ...rows.map(fmt(s))]
}

const GROUPS: Record<'income' | 'cogs' | 'expense', AccountType[]> = { income: ['REVENUE', 'OTHER_INCOME'], cogs: ['COGS'], expense: ['EXPENSE', 'OTHER_EXPENSE'] }
const CREDIT = new Set<AccountType>(['REVENUE', 'OTHER_INCOME'])

/**
 * Analisa Laba/Rugi Departemen / Proyek: per value with activity (by name), then `[Tanpa Departement]` / `[Tanpa Proyek]`, then the total.
 * Pendapatan = revenue + other income, BPP = COGS, Beban = operating + non-operating expense; Laba/Rugi = P − BPP − B.
 * The project variant (Kontraktor Demo) adds a Nomor Proyek column (`-` for no project) and prints id-ID numbers.
 */
export function analysisProfitLossDepartment(accounts: TbAccount[], lines: DimLine[], from: string, to: string) {
  return analysisProfitLossBy(accounts, lines, 'department', from, to)
}
export const analysisProfitLossProject = (accounts: TbAccount[], lines: DimLine[], projectNo: Map<string, string>, from: string, to: string) =>
  analysisProfitLossBy(accounts, lines, 'project', from, to, projectNo)

function analysisProfitLossBy(accounts: TbAccount[], lines: DimLine[], dim: Dim, from: string, to: string, projectNo?: Map<string, string>) {
  const num = projectNo ? formatIdr : formatEn
  const type = new Map(accounts.map(a => [a.no, a.type]))
  const sums = new Map<string | null, { income: number; cogs: number; expense: number }>()
  for (const l of lines) {
    const t = type.get(l.account)
    const g = (Object.keys(GROUPS) as (keyof typeof GROUPS)[]).find(k => t && GROUPS[k].includes(t))
    if (!g || l.date < from || l.date > to) continue
    const s = sums.get(l[dim]) ?? { income: 0, cogs: 0, expense: 0 }
    s[g] += CREDIT.has(t!) ? l.credit - l.debit : l.debit - l.credit
    sums.set(l[dim], s)
  }
  const amounts = (s: { income: number; cogs: number; expense: number }) => [s.income, s.cogs, s.expense, s.income - s.cogs - s.expense].map(num)
  const row = (k: string | null, s: { income: number; cogs: number; expense: number }) =>
    projectNo ? [k ?? '[Tanpa Proyek]', k === null ? '-' : projectNo.get(k)!, ...amounts(s)] : [k ?? '[Tanpa Departement]', ...amounts(s)]
  const keys = [...sums.keys()].filter((k): k is string => k !== null).sort()
  const total = [...sums.values()].reduce((a, s) => ({ income: a.income + s.income, cogs: a.cogs + s.cogs, expense: a.expense + s.expense }), { income: 0, cogs: 0, expense: 0 })
  const name = projectNo ? 'Nama Proyek' : 'Nama Departemen'
  return [[name, ...(projectNo ? ['Nomor Proyek'] : []), 'Pendapatan', 'BPP', 'Beban', 'Laba/Rugi'], ...keys.map(k => row(k, sums.get(k)!)),
    ...(sums.has(null) ? [row(null, sums.get(null)!)] : []), [`Total ${name}`, ...amounts(total)]]
}

/** Daftar Departemen: by name; an empty description prints nothing. */
export const departmentList = async (db: Db) => [['Nama', 'Keterangan'],
  ...(await db.execute(sql`SELECT name, description FROM departments ORDER BY name`)).map(r => [r.name as string, r.description as string].filter(Boolean))]

/** Daftar Proyek: by name; an empty description prints nothing. */
export const projectList = async (db: Db) => [['Nama', 'Keterangan'],
  ...(await db.execute(sql`SELECT name, description FROM projects ORDER BY name`)).map(r => [r.name as string, r.description as string].filter(Boolean))]

export const loadProjectNos = async (db: Db) => new Map((await db.execute(sql`SELECT name, no FROM projects`)).map(r => [r.name as string, r.no as string]))
