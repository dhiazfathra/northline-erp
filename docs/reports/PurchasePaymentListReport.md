# Pembayaran Pembelian (`PurchasePaymentListReport`)

Group: Utang / Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/purchase-t3.json`](fixtures/purchase-t3.json) (purchase invoices P1–P3, payments W1–W2, Jul–Aug 2033). ERP: `apps/api/src/reports/payables.ts` and the shared functions in `receivables.ts` with payable labels; test: `apps/api/test/payables.test.ts`.

Same layout and rules as [Penerimaan Penjualan](SalesReceiptListReport.md) with payable wording: Pemasok / Nama Pemasok, Utang, Faktur Pembelian, Pembayaran Pembelian. Payment numbers share the bank-prefixed sequence (`NL-T1-1101.2033.07.00001`).

Source journals: purchase invoice Dr item expense account (merged per account, listed first) / Cr vendor payable; payment Dr payable / Cr bank.
