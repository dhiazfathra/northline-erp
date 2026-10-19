import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { mergeColumns, months, type StatementOptions } from './financial-statements'
import { formatEn, pl, type DimLine } from './dimensions'
import type { TbAccount } from './trial-balance'

// Laba/Rugi (Perbandingan Anggaran) and its Departemen sibling (ADR-0025); rules in docs/reports/ProfitLossCompareBudgetReport.md.

/** One budget amount (cents, natural side) of an account for a month; department null = scope Umum. */
export interface BudgetLine { account: string; year: number; month: number; department: string | null; amount: number }

export async function loadBudgetLines(db: Db): Promise<BudgetLine[]> {
  return (await db.execute(sql`SELECT l.account_no, b.year, b.month, b.department, l.amount FROM budget_lines l JOIN budgets b ON b.id = l.budget_id`))
    .map(r => ({ account: r.account_no as string, year: Number(r.year), month: Number(r.month), department: r.department as string | null, amount: Number(r.amount) }))
}

const CREDIT_NORMAL = new Set(['REVENUE', 'OTHER_INCOME'])

/** % Var. = variance / |budget|, 2 decimals, id-style comma; 100 % on a zero budget; a negative that rounds to 0 prints `-0`. */
function pct(v: number, budget: number): string {
  if (budget === 0) return v === 0 ? '0 %' : '100 %'
  const p = Math.round((v / Math.abs(budget)) * 10_000) / 100
  return `${p === 0 && v < 0 ? '-0' : String(p).replace('.', ',')} %`
}

/**
 * Aktual vs Anggaran over months sm/sy..em/ey. department null: every journal line against the Umum budgets only;
 * a department: that department's lines against its Per Departemen budgets. Variance = Aktual − Anggaran.
 */
export function profitLossCompareBudget(accounts: TbAccount[], lines: DimLine[], budgets: BudgetLine[], department: string | null,
  sy: number, sm: number, ey: number, em: number, o: StatementOptions) {
  const ms = months(sy, sm, ey, em), from = ms[0]!.from, to = ms.at(-1)!.to
  const type = new Map(accounts.map(a => [a.no, a.type]))
  const own = department === null ? lines : lines.filter(l => l.department === department)
  const plan: DimLine[] = budgets.filter(b => b.department === department).map(b => {
    const cr = CREDIT_NORMAL.has(type.get(b.account)!)
    return { account: b.account, date: `${b.year}-${String(b.month).padStart(2, '0')}-01`, debit: cr ? 0 : b.amount, credit: cr ? b.amount : 0, branch: null, department, project: null }
  })
  const keep = { ...o, showZeroBalance: true }
  const rows = mergeColumns([pl(accounts, own, from, to, keep), pl(accounts, plan, from, to, keep)], o).map(l => {
    if (!l.amounts.length) return [l.label]
    const [a, b] = l.amounts as [number, number]
    return [l.label, formatEn(a), formatEn(b), formatEn(a - b), pct(a - b, b)]
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

