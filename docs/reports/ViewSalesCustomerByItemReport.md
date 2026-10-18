# Penjualan Pelanggan per Barang (`ViewSalesCustomerByItemReport`)

Group: Penjualan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

Columns `Pelanggan` | `Nama Barang` | `Satuan` | `Kuantitas` | `Penjualan`. Per customer: one row per item (customer name only on the first), `Total Nama Barang`; last `Total Pelanggan`. Item rows print the **item master name and unit**, not the invoice line description (fixture line "NL-T2 Jasa Konsultasi lanjutan" prints as "NL-T2 Jasa Konsultasi"). Quantities print with the id-ID format.
