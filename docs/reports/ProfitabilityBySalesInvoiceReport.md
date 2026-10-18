# Profitabilitas per Faktur (`ProfitabilityBySalesInvoiceReport`)

Group: Penjualan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

Columns `Nomor #` | `Tanggal` | `Pelanggan` | `Penjualan` | `BPP` | `Biaya Tambahan` | `Biaya Penerimaan` | `Laba setelah Biaya`. BPP = FIFO cost of the invoice's stock lines (0 for services). Verified with services (`sales-t2.json`) and with stock items (`inventory-t4.json`: 80.000 and 85.000).
