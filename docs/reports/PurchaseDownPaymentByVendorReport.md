# Uang Muka Pembelian (`PurchaseDownPaymentByVendorReport`)

Group: Utang / Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/purchase-dp-t8.json`](fixtures/purchase-dp-t8.json) (DP PI.2034.05.00001 300.000, paid, used in PI.2034.05.00002). ERP: shared down-payment functions in `receivables.ts` with payable labels, `createPurchaseDownPayment`; test: `apps/api/test/purchase-dp.test.ts`.

Same layout and rules as [Uang Muka Penjualan](SalesDownPaymentByCustomerReport.md), per vendor.

Postings: DP Dr Uang Muka Pembelian / Cr Hutang; invoice using it Dr expense (full) / Cr Hutang (net) / Cr Uang Muka Pembelian (used).
