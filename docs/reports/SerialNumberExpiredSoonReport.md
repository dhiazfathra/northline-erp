# Nomor Produksi Segera Kadaluarsa (`SerialNumberExpiredSoonReport`)

Group: Gudang. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SerialNumberExpiredSoonReport.json`](captures/retail/SerialNumberExpiredSoonReport.json).

Status: blocked: requires Serial expiry date.

## Purpose

Menampilkan laporan Nomor seri/produksi yang akan segera kadaluarsa. Daftar Laporan category: Gudang; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040"}`

## Columns

Per-item block `Kode Barang : / Nama Barang :` then `No Seri/Produksi | Kuantitas | Tgl Kadaluarsa | Sisa Hari(Kadaluarsa)`.

## Row grouping

Capture empty: no serial with an expiry date in Retail Demo (serials seen in [SerialNumberStockReport](SerialNumberStockReport.md) have blank expiry).

Title lines: `Nomor Produksi Segera Kadaluarsa`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Kode Barang :`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified; `Sisa Hari(Kadaluarsa)` presumably expiry minus as-of days.

## Verified / unverified

- Verified: layout of the empty report (title, header cells where printed, footer).
- Unverified: all behavior.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

