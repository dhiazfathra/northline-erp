# Profitabilitas per Barang (`ProfitabilityByItemReport`)

Group: Persediaan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/inventory-t4.json`](fixtures/inventory-t4.json) (3 purchases, 2 sales of NL-T4-B1, Oct–Nov 2033). ERP: `apps/api/src/reports/inventory.ts`, costing `src/inventory/fifo.ts` (ADR-0006); test: `apps/api/test/inventory.test.ts`.

Columns `Nama Barang` | `Penjualan` | `BPP` | `Biaya Tambahan` | `Biaya Penerimaan` | `Laba setelah Biaya`: items sold in range, FIFO cost of those sales, margin; `Total Nama Barang`. Fixture: 307.000 − 165.000 = 142.000.
