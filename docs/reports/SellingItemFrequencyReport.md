# Barang Paling Laku (`SellingItemFrequencyReport`)

Group: Penjualan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

Columns `Kode Barang` | `Nama Barang` | `Frekuensi (x Terjual)` | `Kuantitas` | `Nilai Total`. Frequency = number of **invoices** containing the item (fixture: 3 invoices, 4 lines). Ordered by value, highest first (single item in fixture, unverified with several).
