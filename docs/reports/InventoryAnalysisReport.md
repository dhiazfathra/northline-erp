# Ketersediaan Stok Penjualan (`InventoryAnalysisReport`)

Group: Persediaan. **Status: verified** (zero diff on header, Umum block and NL rows, 5 dates). Fixture: [`fixtures/stock-movement.json`](fixtures/stock-movement.json) (`InventoryAnalysisReport`).
ERP: `apps/api/src/reports/inventory.ts` (`inventoryAnalysis`), loader `loadItemList`; test: `apps/api/test/adjustments.test.ts`.

## Parameters

`ASOF` + `selectedBranch` (`[{"name":"[Semua Cabang]","id":null}]`).

## Layout

`Nama Barang | Satuan | Stok Gudang | Dipesan | Dijual | Stok dapat dijual | Jual/Minggu`, stock items in category
blocks in creation order (as [Daftar Barang dan Jasa](ItemListReport.md)); services are not listed.

## Calculation rules

- Stok Gudang = quantity on hand in all warehouses as of the date; Stok dapat dijual = Stok Gudang - Dipesan - Dijual
  (both 0 in every capture).
- **Jual/Minggu** = net quantity sold up to the date (sales invoices and delivery orders, less sales returns) divided by
  weeks, where weeks = floor(days from the item's first sale to the as-of date / 7) + 1. Two decimals, trailing zeros
  dropped.

| As of | Days since first sale (15 Okt 2033) | Weeks | Net sold | Jual/Minggu |
|---|---|---|---|---|
| 15 Nov 2033 | 31 | 5 | 15 | 3 |
| 30 Nov 2033 | 46 | 7 | 15 | 2,14 |
| 10 Des 2033 | 56 | 9 | 13 (return of 2) | 1,44 |
| 23 Des 2033 | 69 | 10 | 13 | 1,3 |
| 31 Des 2033 | 77 | 12 | 13 | 1,08 |

## Open work

- Dipesan / Dijual (open orders, sold not yet delivered) are 0 in all captures (`shortcut:` in the code).
