# Penggunaan Uang Muka Penjualan (`SalesInvoiceDownPaymentDetailReport`)

Group: Penjualan / Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/downpayment-t7.json`](fixtures/downpayment-t7.json) (DP SI.2034.04.00001 500.000 paid by NL-T1-1101.2034.04.00001, used in SI.2034.04.00002). ERP: `apps/api/src/reports/receivables.ts`, `createSalesDownPayment` in `src/sales/service.ts`; test: `apps/api/test/downpayments.test.ts`.

Per DP invoice in range: `Nomor # : <no>  Uang Muka : <amount>`, `Tanggal : <date>  Terpakai/Retur (per Tgl) : <used>`, `Sisa Uang Muka (per Tgl) : <rest>`, header `Nomor Transaksi` | `Tgl Transaksi` | `Tipe Transaksi` | `Pakai Uang Muka (per Tgl)`, one row per invoice that used it, then the used total.
