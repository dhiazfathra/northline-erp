# Umur Piutang (`AgingReceivableReport`)

Group: Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

Params: `asOfDate`, `selectedBranch`. Columns `Mata Uang` | `Pelanggan` | `Piutang` | `Blm Tempo` | `1 - 30` | `31 - 60` | `61 - 90` | `91 - 120` | `> 120` | `Sisa Kredit`.

1. One row per customer with an open balance at `asOfDate` (by name); the currency code prints on the first row only.
2. Each invoice's remaining balance goes to one bucket by days past due (`asOfDate` − due date): ≤ 0 not yet due, 1–30, 31–60, 61–90, 91–120, > 120. Fixture: 101 days → 91–120, 44 days → 31–60.
3. Rows `Total Pelanggan` and `Total Mata Uang` sum all customers.
