import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { compareColumns, mergeColumns, months, periodLabel, profitLoss, type StatementLine, type StatementOptions } from './financial-statements'
import type { AccountType, DailyBalance, TbAccount } from './trial-balance'

// Branch / department / project P&L reports (ADR-0022); rules in docs/reports/ProfitLossByBranchReport.md and siblings.
// Retail Demo prints en-US numbers and splits LABA BERSIH into "(Sebelum Pajak)" / "(Setelah Pajak)" (no tax line modelled).

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
function pl(accounts: TbAccount[], lines: DimLine[], from: string, to: string, o: StatementOptions): StatementLine[] {
  const out = profitLoss(accounts, balances(lines), from, to, o)
  const net = out.pop()!
  return [...out, { ...net, label: 'LABA BERSIH (Sebelum Pajak)' }, { ...net, label: 'LABA BERSIH (Setelah Pajak)' }]
}

type Row = { label: string; amounts: number[]; pct?: (number | null)[] }
const fmt = (l: Row): string[] => [l.label, ...l.amounts.map(formatEn), ...(l.pct ?? []).map(p => `${String(p).replace('.', ',')} %`)]
const zeroKept = (o: StatementOptions) => ({ ...o, showZeroBalance: true })

/** Laba/Rugi Cabang: one column per branch, then Total. */
export function profitLossByBranch(accounts: TbAccount[], lines: DimLine[], branches: string[], defaultBranch: string, from: string, to: string, o: StatementOptions) {
  const cols = branches.map(b => pl(accounts, lines.filter(l => (l.branch ?? defaultBranch) === b), from, to, zeroKept(o)))
  return [['Deskripsi', ...branches, 'Total'], ...mergeColumns(cols, o, true).map(fmt)]
}

/** Laba/Rugi Departemen: one column per selected department, then Total. Lines without a department are left out. */
export function profitLossByDepartment(accounts: TbAccount[], lines: DimLine[], departments: string[], from: string, to: string, o: StatementOptions) {
  const cols = departments.map(d => pl(accounts, lines.filter(l => l.department === d), from, to, zeroKept(o)))
  return [['Deskripsi', ...departments, 'Total'], ...mergeColumns(cols, o, true).map(fmt)]
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

/** Laba/Rugi Departemen (Multi Periode): one department, one column per month (full month name), then Total. */
export function profitLossDepartmentMultiPeriod(accounts: TbAccount[], lines: DimLine[], department: string, sy: number, sm: number, ey: number, em: number, o: StatementOptions) {
  const ms = months(sy, sm, ey, em), own = lines.filter(l => l.department === department)
  const cols = ms.map(m => pl(accounts, own, m.from, m.to, zeroKept(o)))
  // shortcut: header verified within one year only; a cross-year range may print the year too.
  return [['Deskripsi', ...ms.map(m => BULAN[Number(m.from.slice(5, 7)) - 1]!), 'Total'], ...mergeColumns(cols, o, true).map(fmt)]
}

/** Laba/Rugi Departemen / Proyek (Perbandingan Periode): base, compare, variance, % var. over one dimension value. */
export function profitLossComparePeriodBy(accounts: TbAccount[], lines: DimLine[], dim: 'department' | 'project', value: string,
  base: { from: string; to: string }, cmp: { from: string; to: string }, o: StatementOptions) {
  const own = lines.filter(l => l[dim] === value)
  const rows = compareColumns(pl(accounts, own, base.from, base.to, zeroKept(o)), pl(accounts, own, cmp.from, cmp.to, zeroKept(o)), o)
  return [['Deskripsi', periodLabel(base.from, base.to), periodLabel(cmp.from, cmp.to), 'Variance', '% Var.'], ...rows.map(fmt)]
}

const GROUPS: Record<'income' | 'cogs' | 'expense', AccountType[]> = { income: ['REVENUE', 'OTHER_INCOME'], cogs: ['COGS'], expense: ['EXPENSE', 'OTHER_EXPENSE'] }
const CREDIT = new Set<AccountType>(['REVENUE', 'OTHER_INCOME'])

/**
 * Analisa Laba/Rugi Departemen: per department with activity (by name), then `[Tanpa Departement]`, then the total.
 * Pendapatan = revenue + other income, BPP = COGS, Beban = operating + non-operating expense; Laba/Rugi = P − BPP − B.
 */
export function analysisProfitLossDepartment(accounts: TbAccount[], lines: DimLine[], from: string, to: string) {
  const type = new Map(accounts.map(a => [a.no, a.type]))
  const sums = new Map<string | null, { income: number; cogs: number; expense: number }>()
  for (const l of lines) {
    const t = type.get(l.account)
    const g = (Object.keys(GROUPS) as (keyof typeof GROUPS)[]).find(k => t && GROUPS[k].includes(t))
    if (!g || l.date < from || l.date > to) continue
    const s = sums.get(l.department) ?? { income: 0, cogs: 0, expense: 0 }
    s[g] += CREDIT.has(t!) ? l.credit - l.debit : l.debit - l.credit
    sums.set(l.department, s)
  }
  const row = (label: string, s: { income: number; cogs: number; expense: number }) => [label, ...[s.income, s.cogs, s.expense, s.income - s.cogs - s.expense].map(formatEn)]
  const keys = [...sums.keys()].filter((k): k is string => k !== null).sort()
  const total = [...sums.values()].reduce((a, s) => ({ income: a.income + s.income, cogs: a.cogs + s.cogs, expense: a.expense + s.expense }), { income: 0, cogs: 0, expense: 0 })
  return [['Nama Departemen', 'Pendapatan', 'BPP', 'Beban', 'Laba/Rugi'], ...keys.map(k => row(k, sums.get(k)!)),
    ...(sums.has(null) ? [row('[Tanpa Departement]', sums.get(null)!)] : []), row('Total Nama Departemen', total)]
}

/** Daftar Departemen: by name; an empty description prints nothing. */
export const departmentList = async (db: Db) => [['Nama', 'Keterangan'],
  ...(await db.execute(sql`SELECT name, description FROM departments ORDER BY name`)).map(r => [r.name as string, r.description as string].filter(Boolean))]
