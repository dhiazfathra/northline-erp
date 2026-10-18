# Laba/Rugi (Perbandingan Periode) (`ProfitLossComparePeriodReport`)

Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/financial-statements.json`](fixtures/financial-statements.json). ERP: `apps/api/src/reports/financial-statements.ts` (`mergeColumns` and friends).

Params: `startDate`, `endDate` (base), `startDateCompare`, `endDateCompare` plus branch/currency/booleans.
Header "Tanggal 01 Jan 2031 - 31 Jan 2031 dan 01 Feb 2031 - 28 Feb 2031".

Columns: `Deskripsi` | base period label | compare period label | `Variance` | `% Var.`

1. `Variance` = compare − base (on the statement's sign convention).
2. `% Var.` = Variance ÷ |base| × 100, printed as an integer with " %"; base 0 → `100 %` if variance ≠ 0, else `0 %`.
   Fixture: expenses 1.250.000,5 → 1.000.000 gives `-20 %`; operating result -1.250.000,5 → 1.000.000 gives `180 %`.
3. Headings print the label only; rows hidden only when zero in both periods.

Unverified: rounding of non-integer percentages (fixture ratios were exact; ERP uses `Math.round`).
