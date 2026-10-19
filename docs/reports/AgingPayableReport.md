# Umur Utang (`AgingPayableReport`)

Group: Utang / Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/purchase-t3.json`](fixtures/purchase-t3.json) (purchase invoices P1–P3, payments W1–W2, Jul–Aug 2033). ERP: `apps/api/src/reports/payables.ts` and the shared functions in `receivables.ts` with payable labels; test: `apps/api/test/payables.test.ts`.

Params: `asOfDate`, `selectedBranch`. Columns `Pemasok` | `Utang` | `Blm Tempo` | `1 - 30` | `31 - 60` | `61 - 90` | `91 - 120` | `> 120`: no currency or credit column, buckets as in [Umur Piutang](AgingReceivableReport.md) (fixture: 72 days → 61–90, 26 days → 1–30), one `Total Pemasok` row.

Source journals: purchase invoice Dr item expense account (merged per account, listed first) / Cr vendor payable; payment Dr payable / Cr bank.

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop): NL-TP-B1 bought 10 @ 100.000 (PI.2045.03.00003, 5 Mar) and 10 @ 120.000 (PI.2045.03.00004, 12 Mar) from Supplier Umum, sold 15 @ 200.000 (SI.2045.03.00001, 20 Mar) to Andika Motor, net 30.
Fixture [fixtures/trade/trade-tp.json](fixtures/trade/trade-tp.json), test `apps/api/test/trade-portal-trade.test.ts`: zero diff. **Ages from the invoice date**, as Umur Piutang: PIs of 5 and 12 Mar sit in 31 - 60 on 30 Apr. ERP `basis: 'INVOICE_DATE'`. See ADR-0029.
