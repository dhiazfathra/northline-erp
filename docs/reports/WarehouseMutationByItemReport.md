# Mutasi per Gudang (`WarehouseMutationByItemReport`)

Group: Persediaan / Gudang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18, with `selectedWarehouse` = [Utama] / `selectedItem` = [NL-T4-B1]. Fixture: [`fixtures/inventory-t4.json`](fixtures/inventory-t4.json). ERP: `apps/api/src/reports/inventory.ts` (single warehouse "Utama"); test: `apps/api/test/inventory.test.ts`.

Per selected warehouse: `Gudang : <name>`, empty `Gudang`/`Deskripsi` info lines, the warehouse name, header, then per item with movements: name and the same block as [Mutasi per Barang](ItemMutationByWarehouseReport.md); last row the warehouse in/out totals.
