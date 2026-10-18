# Kartu Stok Persediaan (`InventoryStockCardReport`)

Group: Persediaan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/inventory-t4.json`](fixtures/inventory-t4.json) (3 purchases, 2 sales of NL-T4-B1, Oct–Nov 2033). ERP: `apps/api/src/reports/inventory.ts`, costing `src/inventory/fifo.ts` (ADR-0006); test: `apps/api/test/inventory.test.ts`.

Params: `startDate`, `endDate`, `selectedItem` (array of items; empty prints an empty card). Per item: `Barang : <name>`, code and name lines, header `Tanggal` | `Tipe Transaksi` | `Nomor #` | `Deskripsi` | `Kts Masuk` | `Kts Keluar` | `Kts Akhir` | `Gudang`, an opening row `<day before> | Saldo Awal | Saldo Awal <day before> | 0 | 0 | <qty>`, one row per movement with a generated description (`Pembelian dari <vendor>`, `Penjualan ke <customer>`) and warehouse `Utama`, then in/out quantity totals.
