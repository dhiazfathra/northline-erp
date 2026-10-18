# Ringkasan Mutasi Gudang (`WarehouseMutationSummaryReport`)

Group: Persediaan / Gudang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18, with `selectedWarehouse` = [Utama] / `selectedItem` = [NL-T4-B1]. Fixture: [`fixtures/inventory-t4.json`](fixtures/inventory-t4.json). ERP: `apps/api/src/reports/inventory.ts` (single warehouse "Utama"); test: `apps/api/test/inventory.test.ts`.

Columns `Nama Barang Barang & Jasa` | `Saldo Awal` | `Masuk` | `Keluar` | `Saldo Akhir` (quantities) under the warehouse name; items with movements in the range only; totals row.

Multiple warehouses (verified with `transfer-t15.json`): one block per selected warehouse by name; only items with movements.
