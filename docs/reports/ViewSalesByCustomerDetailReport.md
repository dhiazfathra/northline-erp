# Rincian Penjualan per Pelanggan (`ViewSalesByCustomerDetailReport`)

Group: Penjualan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

Columns `Nomor #` | `Tanggal` | `Tipe Transaksi` | `Keterangan` | `Penjualan (Prime)`; currency heading; per customer with invoices: name, invoice rows (`Faktur Penjualan`, description, total), subtotal; last row grand total.
