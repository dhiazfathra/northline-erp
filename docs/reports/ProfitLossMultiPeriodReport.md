# Laba/Rugi (Multi Periode) (`ProfitLossMultiPeriodReport`)

Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/financial-statements.json`](fixtures/financial-statements.json). ERP: `apps/api/src/reports/financial-statements.ts` (`mergeColumns` and friends).

Params: `periodStartMonth` (string "1"–"12"), `periodStartYear`, `periodEndMonth`, `periodEndYear`, plus the
[Laba/Rugi (Standar)](ProfitLossStandardReport.md) branch/currency/boolean params. Header "Dari Periode Desember 2030 s/d Februari 2031".

1. One column per calendar month (`Des 2030 (IDR)`), then `Total (IDR)` = sum of the month columns.
2. Each month column is the standard statement for that month; lines and totals as in the standard report.
3. An account row prints when it is non-zero in **any** column; zero cells print `0`.

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop), NL-TP journals J1-J4 of 2045. Fixture
[fixtures/trade/journal-tp.json](fixtures/trade/journal-tp.json), test `apps/api/test/trade-portal.test.ts`: zero diff.
Rules above unchanged. Only the inputs differ: flat numeric account numbers (`1101` > `110102`), and
branch/currency parameters must be sent as `[]` (`[Semua Cabang]` or omitting them returns a 500). See ADR-0029.
