# Kuantitas Barang per Gudang (`QuantityItemByWarehouseReport`)

Group: Persediaan / Gudang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18, with `selectedWarehouse` = [Utama] / `selectedItem` = [NL-T4-B1]. Fixture: [`fixtures/inventory-t4.json`](fixtures/inventory-t4.json). ERP: `apps/api/src/reports/inventory.ts` (single warehouse "Utama"); test: `apps/api/test/inventory.test.ts`.

Params: `asOfDate`, `selectedWarehouse`, branch. Two header rows: `Nama Barang` | <warehouse> | `Total Nama Gudang`, then `Kuantitas` | `Total Biaya` per column group. Every stock item (zero included) with quantity and FIFO value at `asOfDate`.

Multiple warehouses (verified with `transfer-t15.json`): one column pair per warehouse by name; an item's total FIFO value is split across warehouses by quantity (196.000 × 5/18 = 54.444,44).
