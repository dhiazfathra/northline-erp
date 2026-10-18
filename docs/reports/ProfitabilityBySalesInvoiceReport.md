# Profitabilitas per Faktur (`ProfitabilityBySalesInvoiceReport`)

Group: Penjualan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

Columns `Nomor #` | `Tanggal` | `Pelanggan` | `Penjualan` | `BPP` | `Biaya Tambahan` | `Biaya Penerimaan` | `Laba setelah Biaya`. Service items carry no cost of goods (BPP 0). Inventory costing is verified separately once stock items exist.
