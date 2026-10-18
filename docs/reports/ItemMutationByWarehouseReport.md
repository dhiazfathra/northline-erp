# Mutasi per Barang (`ItemMutationByWarehouseReport`)

Group: Persediaan / Gudang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18, with `selectedWarehouse` = [Utama] / `selectedItem` = [NL-T4-B1]. Fixture: [`fixtures/inventory-t4.json`](fixtures/inventory-t4.json). ERP: `apps/api/src/reports/inventory.ts` (single warehouse "Utama"); test: `apps/api/test/inventory.test.ts`.

Per selected item: `Barang : <name>`, `Kode Barang Barang & Jasa : <no>`, `Nama Barang : <name>`, header `Nomor #` | `Tanggal` | `Deskripsi` | `Masuk` | `Keluar` | `Saldo`, then per warehouse: its name, `Saldo Barang per <day before> | 0 | 0 | <qty>`, movements with generated descriptions and running quantity, in/out totals.
