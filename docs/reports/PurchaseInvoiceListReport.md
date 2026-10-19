# Daftar Faktur Pembelian (`PurchaseInvoiceListReport`)

Group: Utang / Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/purchase-t3.json`](fixtures/purchase-t3.json) (purchase invoices P1–P3, payments W1–W2, Jul–Aug 2033). ERP: `apps/api/src/reports/payables.ts` and the shared functions in `receivables.ts` with payable labels; test: `apps/api/test/payables.test.ts`.

Same layout and rules as [Daftar Faktur Penjualan](SalesInvoiceListReport.md) with payable wording: Pemasok / Nama Pemasok, Utang, Faktur Pembelian, Pembayaran Pembelian.

Source journals: purchase invoice Dr item expense account (merged per account, listed first) / Cr vendor payable; payment Dr payable / Cr bank.

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop): NL-TP-B1 bought 10 @ 100.000 (PI.2045.03.00003, 5 Mar) and 10 @ 120.000 (PI.2045.03.00004, 12 Mar) from Supplier Umum, sold 15 @ 200.000 (SI.2045.03.00001, 20 Mar) to Andika Motor, net 30.
Fixture [fixtures/trade/trade-tp.json](fixtures/trade/trade-tp.json), test `apps/api/test/trade-portal-trade.test.ts`: zero diff. Same columns and rule. See ADR-0029.
