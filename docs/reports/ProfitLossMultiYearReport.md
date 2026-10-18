# Laba/Rugi (Multi Year) (`ProfitLossMultiYearReport`)

Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/financial-statements.json`](fixtures/financial-statements.json). ERP: `apps/api/src/reports/financial-statements.ts` (`mergeColumns` and friends).

Params: `asOfYear` (number) plus branch/currency/booleans. Header "per 2031".

1. Three fiscal-year columns ending at `asOfYear` (`2029 (IDR)`, `2030 (IDR)`, `2031 (IDR)`), then `Total (IDR)`.
2. Each column is the full fiscal year; row visibility as in Multi Periode.

Unverified: fiscal year not starting in January (columns assumed to follow fiscal years).
