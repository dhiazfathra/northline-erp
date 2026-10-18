# Uang Muka Penjualan (`SalesDownPaymentByCustomerReport`)

Group: Penjualan / Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/downpayment-t7.json`](fixtures/downpayment-t7.json) (DP SI.2034.04.00001 500.000 paid by NL-T1-1101.2034.04.00001, used in SI.2034.04.00002). ERP: `apps/api/src/reports/receivables.ts`, `createSalesDownPayment` in `src/sales/service.ts`; test: `apps/api/test/downpayments.test.ts`.

Columns `Nomor #` | `Tanggal` | `Total` | `Terpakai/Retur (per Tgl)` | `Sisa Uang Muka (per Tgl)` | `No Pesanan #`. Per customer with down-payment invoices in range: name, one row per DP (used amount as of the end date, remaining; empty order number prints nothing).
