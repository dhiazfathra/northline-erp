# Faktur Belum Lunas per Pelanggan (`OutstandingSalesInvoicePerCustomerReport`)

Group: Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

Params: `asOfDate`, `selectedBranch`. Columns `Mata Uang` | `Pelanggan` | `Total` | `Piutang` | `Piutang Pajak`; one row per customer with open invoices (invoice totals and remaining balances), the currency name on the first row; rows `Total Pelanggan`, `Total Mata Uang`.

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop): NL-TP-B1 bought 10 @ 100.000 (PI.2045.03.00003, 5 Mar) and 10 @ 120.000 (PI.2045.03.00004, 12 Mar) from Supplier Umum, sold 15 @ 200.000 (SI.2045.03.00001, 20 Mar) to Andika Motor, net 30.
Fixture [fixtures/trade/trade-tp.json](fixtures/trade/trade-tp.json), test `apps/api/test/trade-portal-trade.test.ts`: zero diff. Same columns and rule. See ADR-0029.
