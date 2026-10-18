# Kartu Stok Persediaan (`InventoryStockCardReport`)

Group: Persediaan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/inventory-t4.json`](fixtures/inventory-t4.json) (3 purchases, 2 sales of NL-T4-B1, Oct–Nov 2033). ERP: `apps/api/src/reports/inventory.ts`, costing `src/inventory/fifo.ts` (ADR-0006); test: `apps/api/test/inventory.test.ts`.

Params: `startDate`, `endDate`, `selectedItem` (array of items; empty prints an empty card). Per item: `Barang : <name>`, code and name lines, header `Tanggal` | `Tipe Transaksi` | `Nomor #` | `Deskripsi` | `Kts Masuk` | `Kts Keluar` | `Kts Akhir` | `Gudang`, an opening row `<day before> | Saldo Awal | Saldo Awal <day before> | 0 | 0 | <qty>`, one row per movement with a generated description (`Pembelian dari <vendor>`, `Penjualan ke <customer>`) and warehouse `Utama`, then in/out quantity totals.

Opening and totals (verified with `returns-t6.json`, opening 10): the opening row prints the balance in the **Kts Masuk** column (`30 Nov 2033 | Saldo Awal | Saldo Awal 30 Nov 2033 | 10 | 0 | 10`) and the in-total includes it (`12 | 1`). Returns print as `Retur Penjualan` / `Retur dari <customer>` and `Retur Pembelian` / `Retur ke <vendor>`.

Transfers (verified with `transfer-t15.json`): each transfer prints two rows (source/transit or transit/destination) with the warehouse column; `Saldo Awal <date>` uses English month abbreviations (`31 Oct 2034`).
