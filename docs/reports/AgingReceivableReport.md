# Umur Piutang (`AgingReceivableReport`)

Group: Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

Params: `asOfDate`, `selectedBranch`. Columns `Mata Uang` | `Pelanggan` | `Piutang` | `Blm Tempo` | `1 - 30` | `31 - 60` | `61 - 90` | `91 - 120` | `> 120` | `Sisa Kredit`.

1. One row per customer with an open balance at `asOfDate` (by name); the currency code prints on the first row only.
2. Each invoice's remaining balance goes to one bucket by days past due (`asOfDate` − due date): ≤ 0 not yet due, 1–30, 31–60, 61–90, 91–120, > 120. Fixture: 101 days → 91–120, 44 days → 31–60.
3. Rows `Total Pelanggan` and `Total Mata Uang` sum all customers.

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop): NL-TP-B1 bought 10 @ 100.000 (PI.2045.03.00003, 5 Mar) and 10 @ 120.000 (PI.2045.03.00004, 12 Mar) from Supplier Umum, sold 15 @ 200.000 (SI.2045.03.00001, 20 Mar) to Andika Motor, net 30.
Fixture [fixtures/trade/trade-tp.json](fixtures/trade/trade-tp.json), test `apps/api/test/trade-portal-trade.test.ts`: zero diff. **Ages from the invoice date**, not the due date: SI dated 20 Mar, due 19 Apr, sits in 31 - 60 on 30 Apr (41 days from the invoice date; 11 days past due would be 1 - 30). The ERP takes `basis: 'INVOICE_DATE'` for this. The header prints `> 120` (older captures kept the HTML escape `&gt; 120`). See ADR-0029.
