# Laba/Rugi (Perbandingan Periode) (`ProfitLossComparePeriodReport`)

Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/financial-statements.json`](fixtures/financial-statements.json). ERP: `apps/api/src/reports/financial-statements.ts` (`mergeColumns` and friends).

Params: `startDate`, `endDate` (base), `startDateCompare`, `endDateCompare` plus branch/currency/booleans.
Header "Tanggal 01 Jan 2031 - 31 Jan 2031 dan 01 Feb 2031 - 28 Feb 2031".

Columns: `Deskripsi` | base period label | compare period label | `Variance` | `% Var.`

1. `Variance` = compare − base (on the statement's sign convention).
2. `% Var.` = Variance ÷ |base| × 100, printed as an integer with " %"; base 0 → `100 %` if variance ≠ 0, else `0 %`.
   Fixture: expenses 1.250.000,5 → 1.000.000 gives `-20 %`; operating result -1.250.000,5 → 1.000.000 gives `180 %`.
3. Headings print the label only; rows hidden only when zero in both periods.

Rounding: 2 decimals, verified on [Neraca (Perbandingan Periode)](BalanceSheetComparePeriodReport.md) (`8,82 %`).

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop), NL-TP journals J1-J4 of 2045. Fixture
[fixtures/trade/journal-tp.json](fixtures/trade/journal-tp.json), test `apps/api/test/trade-portal.test.ts`: zero diff.
Rules above unchanged. Only the inputs differ: flat numeric account numbers (`1101` > `110102`), and
branch/currency parameters must be sent as `[]` (`[Semua Cabang]` or omitting them returns a 500). See ADR-0029.
