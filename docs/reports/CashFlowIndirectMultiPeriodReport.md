# Arus Kas Multi Period (Tak Langsung) (`CashFlowIndirectMultiPeriodReport`)

Group: Keuangan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/cash-flow.json`](fixtures/cash-flow.json). ERP: `apps/api/src/reports/cash-flow.ts`; test: `apps/api/test/cash-flow.test.ts`.

Params: `periodStartMonth`, `periodStartYear`, `periodEndMonth`, `periodEndYear`, `selectedBranch`.

Same rows as [`CashFlowIndirectReport`](CashFlowIndirectReport.md), one column per calendar month (`Des 2030`, `Jan 2031`, …; no "(IDR)", no total column).
Kas & Setara Kas di Awal period of each month = Akhir period of the previous month. Account rows print when non-zero in any month.
