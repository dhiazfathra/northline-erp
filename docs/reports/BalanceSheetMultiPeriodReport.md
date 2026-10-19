# Neraca (Multi Periode) (`BalanceSheetMultiPeriodReport`)

Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/financial-statements.json`](fixtures/financial-statements.json). ERP: `apps/api/src/reports/financial-statements.ts` (`mergeColumns` and friends).

Params: `periodStartMonth`, `periodStartYear`, `periodEndMonth`, `periodEndYear`, currency + booleans (no branch).

1. One column per month **end** (`31 Des 2030 (IDR)`, `31 Jan 2031 (IDR)`, `28 Feb 2031 (IDR)`; day without leading zero). No total column.
2. Each column is [Neraca (Standar)](BalanceSheetStandardReport.md) at that date, so Laba Ditahan and Laba Tahun Ini roll at
   the fiscal-year boundary per column (fixture: Laba Tahun Ini 3.000.000 → -1.250.000,5 → -250.000,5).
3. Account rows print when non-zero in any column.

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop). Month ends Jan - Feb 2045, fixture [fixtures/trade/journal-tp.json](fixtures/trade/journal-tp.json), test `apps/api/test/trade-portal.test.ts`: zero diff. See ADR-0029.
