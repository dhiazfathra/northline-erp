# Laba/Rugi (Kuartal) (`ProfitLossQuarterReport`)

Group: Keuangan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/financial-statements.json`](fixtures/financial-statements.json). ERP: `apps/api/src/reports/financial-statements.ts`; test: `apps/api/test/statements.test.ts`.

Params: `asOfYear` + branch/currency/booleans. Header "per 2031".

Columns `Jan - Mar (IDR)`, `Apr - Jun (IDR)`, `Jul - Sep (IDR)`, `Okt - Des (IDR)`, `Total (IDR)`; each column is the
[standard statement](ProfitLossStandardReport.md) for that quarter. Row visibility as in Multi Periode.

Unverified: quarters for a fiscal year not starting in January (calendar quarters assumed).
