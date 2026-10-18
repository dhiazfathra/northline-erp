# Stok Nomor Seri/Produksi per Gudang (`SerialNumberStockPerWarehouseReport`)

Group: Gudang. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SerialNumberStockPerWarehouseReport.json`](captures/retail/SerialNumberStockPerWarehouseReport.json).

Status: existing module; spec + verify.

## Purpose

Menampilkan daftar stok nomor seri/produksi per gudang per barang. Daftar Laporan category: Gudang; view type `report`.

## Params

Date kind `ASOF`: `asOfDate` (dd/MM/yyyy).
- `selectedItem`: ITEM_SN_MULTI, default []

Params used for the capture (default over all history unless stated): `{"asOfDate":"31/12/2040","selectedItem":[]}`

## Columns

Same columns as [SerialNumberStockReport](SerialNumberStockReport.md) with a warehouse level: `Kode Barang`, `Nama Barang`, then `No Seri/Produksi | Kuantitas | Tgl Kadaluarsa | Sisa Hari(Kadaluarsa)`.

## Row grouping

Capture empty (default selection). By analogy with the unfiltered sibling, selecting items likely yields data per warehouse (GD. JAKARTA, GD. SURABAYA); not re-run.

Title lines: `Stok Nomor Seri/Produksi per Gudang`, `Per Tgl. 31 Des 2040`, `Kode Barang :`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified (capture empty; a selected-item run was only made for the non-warehouse report).

## Verified / unverified

- Verified: layout of the empty report (title, header cells where printed, footer).
- Unverified: warehouse grouping, selection params, all numbers.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

