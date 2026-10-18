# Nilai Persediaan (`InventoryValuationReport`)

Group: Persediaan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/inventory-t4.json`](fixtures/inventory-t4.json) (3 purchases, 2 sales of NL-T4-B1, Oct–Nov 2033). ERP: `apps/api/src/reports/inventory.ts`, costing `src/inventory/fifo.ts` (ADR-0006); test: `apps/api/test/inventory.test.ts`.

Params: `startDate`, `endDate`, `selectedBranch`. Two header rows: `Nama Barang` | `Kode Barang` | `Saldo Awal` | `Masuk` | `Keluar` | `Saldo Akhir`, then quantity/value pairs. One row per stock item by name (zero rows included), opening before `startDate`, ins and outs at FIFO cost, closing; `Total Nama Barang`. Fixture NL-T4-B1: 0 | 0 | 25 | 303.000 | 15 | 165.000 | 10 | 138.000.
