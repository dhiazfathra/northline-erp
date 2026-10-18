# Stok Nomor Seri/Produksi per Barang (`SerialNumberStockPerItemReport`)

Group: Gudang. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SerialNumberStockPerItemReport.json`](captures/retail/SerialNumberStockPerItemReport.json).

Status: existing module; spec + verify.

## Purpose

Menampilkan daftar stok nomor seri/produksi per barang per gudang. Daftar Laporan category: Gudang; view type `report`.

## Params

Date kind `ASOF`: `asOfDate` (dd/MM/yyyy).
- `selectedWarehouse`: WAREHOUSE, default null

Params used for the capture (default over all history unless stated): `{"asOfDate":"31/12/2040"}`

## Columns

`No Seri/Produksi | Kuantitas | Tgl Kadaluarsa | Sisa Hari(Kadaluarsa)`

## Row grouping

Capture empty (title `Stok Nomor Seri/Produksi per Barang`, subtitle `Per Tgl. 31 Des 2040`). Run once more with the same params: still empty (checked). No item filter in the param list (as-of only); why it is empty while the item-filtered sibling returns 82 serials is unknown.

Title lines: `Stok Nomor Seri/Produksi per Barang`, `Per Tgl. 31 Des 2040`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified.

## Verified / unverified

- Verified: layout of the empty report (title, header cells where printed, footer).
- Unverified: whether an item selection is required (not in the Daftar Laporan param list captured), all data.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

