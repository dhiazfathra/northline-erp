# Stok Nomor Seri/Produksi (`SerialNumberStockReport`)

Group: Gudang. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SerialNumberStockReport.json`](captures/retail/SerialNumberStockReport.json).

Status: existing module; spec + verify.

## Purpose

Menampilkan daftar stok nomor seri/produksi barang. Daftar Laporan category: Gudang; view type `report`.

## Params

Date kind `ASOF`: `asOfDate` (dd/MM/yyyy).
- `selectedItem`: ITEM_SN_MULTI, default []

Params used for the capture (default over all history unless stated): `{"asOfDate":"31/12/2040","selectedItem":[]}`

## Columns

Per-item block: `Kode Barang : <code>` / `Nama Barang : <name>`, then `No Seri/Produksi | Kuantitas | Tgl Kadaluarsa | Sisa Hari(Kadaluarsa)`.

## Row grouping

Capture with `selectedItem=[]` is empty; Capture default (empty selection) printed no rows. Drill-down with explicit items returned data, see below. One block per item, one row per serial/production number, no total row. Blocks repeat the title and column header on every page (13 pages for 4 items).

Title lines: `Stok Nomor Seri/Produksi`, `Per Tgl. 31 Des 2040`, `Kode Barang :`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Empty selection prints nothing (checked by run); selecting the 4 serial-tracked items returned 602 raw rows.
- Quantity is `1` per serial for `UNIQUE` serial items: 5116001 Iphone 5 16 GB: 18 serials (qty sum 18); 5132002 Iphone 5 32 GB: 30; 5164003 Iphone 5 64 GB: 28; 5164003A Iphone 5 64 GB + Antigores: 6 (checked by counting the drill-down rows).
- Serial counts (18/30/28/6) are far below the item stock quantities from the item search (100/132/159/98): only part of the stock carries serial numbers in Retail Demo; why is unverified.
- `Tgl Kadaluarsa` blank and `Sisa Hari` 0 for these serials (no expiry tracked).

## Drill-down (ACC_DB=retail, read-only)

- `inventory/search-item.do` (first page, 20 of 64 items): items 50 (5116001), 51 (5132002), 52 (5164003), 1700 (5164003A) have `serialNumberType = UNIQUE`.
- `ACC_DB=retail node tools/accurate/report.mjs SerialNumberStockReport '{"asOfDate":"31/12/2040","selectedItem":[{"id":50},{"id":51},{"id":52},{"id":1700}]}'` returned 82 serial rows in 4 blocks.

## Verified / unverified

- Verified: empty default; with selection: block structure and per-item serial counts.
- Unverified: expiry columns with real dates, other 60 items (only first search page read), as-of dates in the past, why serial counts differ from stock.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).
- Default capture is empty because `selectedItem=[]` means no items (not all items); contrast with branch params where `[]`/all works.
