# Neraca (Multi Year) (`BalanceSheetMultiYearReport`)

Group: Keuangan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/financial-statements.json`](fixtures/financial-statements.json). ERP: `apps/api/src/reports/financial-statements.ts`; test: `apps/api/test/statements.test.ts`.

Params: `asOfYear` + currency/booleans. Columns: the three years ending at `asOfYear` (`2030 (IDR)` … `2032 (IDR)`), each the
[Neraca (Standar)](BalanceSheetStandardReport.md) at **31 Dec** of that year, also for a year not yet over. No total column.
Fixture: 2032 column includes J7–J9 (Modal 13.500.000, Laba Tahun Ini 750.000).
