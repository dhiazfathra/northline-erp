# ADR-0025: Budgets (Anggaran) per month and scope

## Status
Accepted

## Date
2026-10-19

## Context
`ProfitLossCompareBudgetReport` and `ProfitLossCompareBudgetDepartmentReport` were blocked on a budget model.
Accurate's Anggaran (`accurate__budget-target__accountbudget-target`) is one document per year, month and scope
(`Umum` or `Per Departemen` with a department), with lines of account and amount (`amountPeriod`). Retail Demo was
seeded with NL-RB data in 2042 (`docs/reports/fixtures/retail/budget-rb.json`) and both reports captured.

## Decision
- Migration 0047: `budgets` (year, month, department NULL = Umum, notes; unique per year, month and department) and
  `budget_lines` (account, amount in cents on the account's natural side). Plain master data with audit history.
- `apps/api/src/reports/budget.ts` builds the Aktual column and the Anggaran column with the dimension P&L
  (ADR-0022), merges them and adds Variance = Aktual - Anggaran and % of |Anggaran|.
- The general report compares every journal line against Umum budgets only; the department report compares a
  department's lines against its own budgets. With several departments selected Accurate prints only the last one's
  numbers under a heading naming all of them; we copy that.

## Alternatives Considered
- **Budget lines on a per-account yearly row with 12 month columns**: closer to a spreadsheet, but Accurate stores one
  document per month and the reports only need monthly sums.
- **Summing selected departments**: more intuitive, but not what Accurate prints, so the zero-diff goal rules it out.

## Consequences
- No API endpoint or UI for budgets yet; rows are inserted directly (tests do this).
- Per Proyek budgets and branch-scoped budgets are not modelled (the Retail Demo form offers only Umum / Per Departemen).
