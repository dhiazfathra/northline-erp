# Ketersediaan Stok Penjualan (`InventoryAnalysisReport`)

Group: Persediaan. **Status: verified** (zero diff on header, Umum block and NL rows, 5 dates). Fixture: [`fixtures/stock-movement.json`](fixtures/stock-movement.json) (`InventoryAnalysisReport`).
ERP: `apps/api/src/reports/inventory.ts` (`inventoryAnalysis`), loader `loadItemList`; test: `apps/api/test/adjustments.test.ts`.

## Parameters

`ASOF` + `selectedBranch` (`[{"name":"[Semua Cabang]","id":null}]`).

## Layout

`Nama Barang | Satuan | Stok Gudang | Dipesan | Dijual | Stok dapat dijual | Jual/Minggu`, stock items in category
blocks in creation order (as [Daftar Barang dan Jasa](ItemListReport.md)); services are not listed.

## Calculation rules

- Stok Gudang = on hand in all warehouses as of the date. **Dipesan = open purchase-order quantity** (stock on order from
  vendors, see [the detail report](InventoryAnalysisDetailReport.md)). Stok dapat dijual = Stok Gudang. Dijual = 0.
- **Jual/Minggu** = (sales invoice quantity - sales return quantity) dated in the **last 3 calendar months** (as-of date
  minus 3 months, inclusive) / weeks, weeks = floor(days from the first invoice in that window to the as-of date / 7) + 1.
  0 when the window holds no invoice. Delivery orders do not count; a delivered invoice counts on its own date.
  Two decimals, trailing zeros dropped.

| As of | Window from | Invoices in window | Net | Weeks | Jual/Minggu |
|---|---|---|---|---|---|
| 15 Nov 2033 | 15 Agu 2033 | 15 Okt (8), 5 Nov (7) | 15 | 5 | 3 |
| 30 Nov 2033 | 30 Agu 2033 | same | 15 | 7 | 2,14 |
| 10 Des 2033 | 10 Sep 2033 | same, return 5 Des (-2) | 13 | 9 | 1,44 |
| 31 Des 2033 | 30 Sep 2033 | same | 13 | 12 | 1,08 |
| 15 Jan 2034 | 15 Okt 2033 (inclusive) | same | 13 | 14 | 0,93 |
| 1 Mar 2034 | 1 Des 2033 | none (return only) | - | - | 0 |
| 6 Okt 2034 | 6 Jul 2034 | none (DO on 5 Okt does not count) | - | - | 0 |
| 8 Okt 2034 | 8 Jul 2034 | SI 8 Okt (4) | 4 | 1 | 4 |
| 31 Okt 2034 | 31 Jul 2034 | same | 4 | 4 | 1 |

## Open work

- Dijual is 0 in all captures; partially processed purchase orders are not captured (`shortcut:` in the code).
