import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { mergeColumns, months, type StatementOptions } from './financial-statements'
import { RETAIL, type DimLine, type Style } from './dimensions'
import type { TbAccount } from './trial-balance'

// Laba/Rugi (Perbandingan Anggaran) and its Departemen sibling (ADR-0025); rules in docs/reports/ProfitLossCompareBudgetReport.md.

/** One budget amount (cents, natural side) of an account for a month; department and project null = scope Umum. */
export interface BudgetLine { account: string; year: number; month: number; department: string | null; project: string | null; amount: number }

export async function loadBudgetLines(db: Db): Promise<BudgetLine[]> {
  return (await db.execute(sql`SELECT l.account_no, b.year, b.month, b.department, b.project, l.amount FROM budget_lines l JOIN budgets b ON b.id = l.budget_id`))
    .map(r => ({ account: r.account_no as string, year: Number(r.year), month: Number(r.month), department: r.department as string | null, project: r.project as string | null, amount: Number(r.amount) }))
}

const CREDIT_NORMAL = new Set(['REVENUE', 'OTHER_INCOME'])

/** % Var. = variance / |budget|, 2 decimals, id-style comma; 100 % on a zero budget; a negative that rounds to 0 prints `-0`. */
function pct(v: number, budget: number): string {
  if (budget === 0) return v === 0 ? '0 %' : '100 %'
  const p = Math.round((v / Math.abs(budget)) * 10_000) / 100
  return `${p === 0 && v < 0 ? '-0' : String(p).replace('.', ',')} %`
}

/**
 * Aktual vs Anggaran over months sm/sy..em/ey. value null: every journal line against the Umum budgets only;
 * a department / project: its lines against its Per Departemen / Per Proyek budgets. Variance = Aktual − Anggaran.
 */
export function profitLossCompareBudget(accounts: TbAccount[], lines: DimLine[], budgets: BudgetLine[], value: string | null,
  sy: number, sm: number, ey: number, em: number, o: StatementOptions, dim: 'department' | 'project' = 'department', s: Style = RETAIL) {
  const ms = months(sy, sm, ey, em), from = ms[0]!.from, to = ms.at(-1)!.to
  const type = new Map(accounts.map(a => [a.no, a.type]))
  const own = value === null ? lines : lines.filter(l => l[dim] === value)
  const plan: DimLine[] = budgets.filter(b => value === null ? b.department === null && b.project === null : b[dim] === value).map(b => {
    const cr = CREDIT_NORMAL.has(type.get(b.account)!)
    return { account: b.account, date: `${b.year}-${String(b.month).padStart(2, '0')}-01`, debit: cr ? 0 : b.amount, credit: cr ? b.amount : 0, branch: null, department: null, project: null }
  })
  const keep = { ...o, showZeroBalance: true }
  const rows = mergeColumns([s.pl(accounts, own, from, to, keep), s.pl(accounts, plan, from, to, keep)], o).map(l => {
    if (!l.amounts.length) return [l.label]
    const [a, b] = l.amounts as [number, number]
    return [l.label, s.num(a), s.num(b), s.num(a - b), pct(a - b, b)]
  })
  return [['Deskripsi', 'Aktual (IDR)', 'Anggaran', 'Variance', '% Var.'], ...rows]
}

/**
 * Laba/Rugi Departemen (Perbandingan Anggaran). Accurate prints one block headed with every selected name, but its numbers
 * are the last selected department's only (captured: [D1, D2] shows D2, [D2, D1] shows D1).
 */
export const profitLossCompareBudgetDepartment = (accounts: TbAccount[], lines: DimLine[], budgets: BudgetLine[], departments: string[],
  sy: number, sm: number, ey: number, em: number, o: StatementOptions) =>
  [[`Departemen : ${departments.join(', ')}`], ...profitLossCompareBudget(accounts, lines, budgets, departments.at(-1)!, sy, sm, ey, em, o)]

