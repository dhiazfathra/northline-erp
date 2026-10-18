# Umur Utang (`AgingPayableReport`)

Group: Utang / Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/purchase-t3.json`](fixtures/purchase-t3.json) (purchase invoices P1–P3, payments W1–W2, Jul–Aug 2033). ERP: `apps/api/src/reports/payables.ts` and the shared functions in `receivables.ts` with payable labels; test: `apps/api/test/payables.test.ts`.

Params: `asOfDate`, `selectedBranch`. Columns `Pemasok` | `Utang` | `Blm Tempo` | `1 - 30` | `31 - 60` | `61 - 90` | `91 - 120` | `> 120`: no currency or credit column, buckets as in [Umur Piutang](AgingReceivableReport.md) (fixture: 72 days → 61–90, 26 days → 1–30), one `Total Pemasok` row.

Source journals: purchase invoice Dr item expense account (merged per account, listed first) / Cr vendor payable; payment Dr payable / Cr bank.
