# Daftar Komisi Penjual (`SalesmanCommissionListReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesmanCommissionListReport.json`](captures/retail/SalesmanCommissionListReport.json).

Status: blocked: requires Salesman commission. Fixture: [`fixtures/retail/SalesmanCommissionListReport.json`](fixtures/retail/SalesmanCommissionListReport.json) (Retail Demo).

## Purpose

Laporan yang berisi daftar perhitungan komisi untuk tenaga penjual. Daftar Laporan category: Tenaga Penjual; view type `report`.

## Params

Date kind `NONE`: none (no date parameter).

Params used for the capture (default over all history unless stated): `{}`

## Columns

`Nama` | `Berlaku pada` | `Dengan Syarat` | `Mendapatkan Komisi` | `Berlaku ke Penjual`

## Row grouping

One row per commission definition. Retail Demo: `Komisi Team` | `Semua Barang` | `Tanpa batasan dan syarat` | `7 % dari Nilai Penjualan` | `Urutan (DO NOT SHOW) Pertama, Kedua, Ketiga, Keempat dan Kelima`.

Title lines: `Daftar Komisi Penjual`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- The 7% rule is confirmed by arithmetic in [SalesmanCommissionByInvoiceSummaryReport](SalesmanCommissionByInvoiceSummaryReport.md) (checked).
- The `Berlaku ke Penjual` cell prints an internal placeholder `(DO NOT SHOW)` text verbatim: Accurate bug worth keeping out of the ERP.

## Verified / unverified

- Verified: layout, header cells and the sums stated above, against the Retail Demo capture only.
- Unverified: other commission types (per item, tiered, with conditions).

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

