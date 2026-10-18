# Penyesuaian Harga Beli (`VendorPriceAdjustmentDetailReport`)

Group: Pembelian. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/VendorPriceAdjustmentDetailReport.json`](captures/retail/VendorPriceAdjustmentDetailReport.json).

Status: existing module; spec + verify.

## Purpose

Menampilkan laporan harga beli barang. Daftar Laporan category: Pembelian; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040"}`

## Columns

Header block `Nomor # : | Mata Uang :`, `Mulai Berlaku : | Tanggal Berakhir :`, `Pemasok :`; lines `Kode # | Nama Barang | Harga Baru`.

## Row grouping

Empty: no vendor price adjustments in the date range (template only: labels with empty values).

Title lines: `Penyesuaian Harga Beli`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Nomor # : Mata Uang :`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified. Selling price adjustments exist in the tool README, but the purchase-side search endpoint was not found (3 guessed `search-*.do` paths returned 404), so absence of documents was not confirmed.

## Verified / unverified

- Verified: layout of the empty report (title, header cells where printed, footer).
- Unverified: existence of documents in Retail Demo, all behavior.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

