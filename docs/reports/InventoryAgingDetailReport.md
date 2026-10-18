# Rincian Umur Persediaan (`InventoryAgingDetailReport`)

Group: Persediaan. **Status: verified** (zero diff, 3 dates). Fixture: [`fixtures/stock-movement.json`](fixtures/stock-movement.json) (`InventoryAgingDetailReport`).
ERP: `apps/api/src/reports/inventory.ts` (`inventoryAgingDetail`); test: `apps/api/test/adjustments.test.ts`.

## Parameters

`ASOF` + `selectedItem` and `selectedWarehouse` as **arrays of `{id}`** (NL-T4-B1 = 350, Utama = 50). With
`selectedItem: []` only the title prints.

## Layout

`Kode Barang : <no> | Satuan : <unit>`, `Nama Barang : <name> | Stok : <qty>`, then
`No Referensi | Tanggal | Tipe Transaksi | 1 - 30 | 31 - 60 | 61 - 90 | 91 - 120 | > 120`, one row per remaining layer,
and a last row with the bucket totals.

## Calculation rules

- Every incoming move in the warehouse opens a FIFO layer (Faktur Pembelian, Penerimaan Barang, Retur Penjualan,
  Penyesuaian Persediaan in). Outgoing moves (sales, purchase returns, adjustments out) consume the oldest layers first.
- Remaining quantity of each layer goes into the bucket of its age (as-of date - layer date, days).

| As of | Layers left (age bucket) |
|---|---|
| 30 Nov 2033 | PI.2033.10.00002 5 (31-60), PI.2033.10.00003 5 (31-60) |
| 31 Des 2033 | PI...00002 4 (61-90, purchase return took 1), PI...00003 5 (61-90), SRT.2033.12.00001 2 (1-30) |
| 31 Jul 2034 | PI...00002 2, PI...00003 5, SRT 2 (> 120); RI.2034.06.00001 5, PI.2034.06.00001 5 (31-60); IA.2034.07.00001 3 (1-30) |
