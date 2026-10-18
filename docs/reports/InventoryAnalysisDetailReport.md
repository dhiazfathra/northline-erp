# Rincian Ketersediaan Stok Penjualan (`InventoryAnalysisDetailReport`)

Group: Persediaan. **Status: verified** (zero diff, 4 dates). Fixture: [`fixtures/stock-movement.json`](fixtures/stock-movement.json) (`InventoryAnalysisDetailReport`).
ERP: `apps/api/src/reports/inventory.ts` (`inventoryAnalysisDetail`); test: `apps/api/test/adjustments.test.ts`.

## Parameters

`ASOF` + `selectedItem` as an array of `{id}` (NL-T4-B1 = 350).

## Layout

Label/value pairs `Dipesan`, `Dijual`, `Stok dapat dijual`, `Stok Gudang` (each label row followed by `: <value>`), then
`No Referensi | Tgl Estimasi | Nama Referensi | Dipesan | Dijual` and a totals row.

## Calculation rules

- Dipesan = quantity on the item's open **purchase orders** dated by the as-of date (PO.2034.06.00001, 5, NL-T3 Pemasok A;
  Tgl Estimasi = order date). Sales orders do not appear (SO.2034.10.00001 on 2 Okt 2034 is absent).
- Stok Gudang = on hand, all warehouses; Stok dapat dijual = Stok Gudang. Dijual = 0 in every capture.
- With no open order line, every value cell is empty (30 Nov 2033: labels and `:` only, no rows).
- The T9 purchase order was never linked to its receipt or invoice in Accurate, so its whole quantity stays open.
