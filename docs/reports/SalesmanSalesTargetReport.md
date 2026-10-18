# Target Penjualan Penjual (`SalesmanSalesTargetReport`)

Group: Penjualan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesmanSalesTargetReport.json`](captures/retail/SalesmanSalesTargetReport.json).

Status: blocked: requires Salesman on invoice.

## Purpose

Menampilkan capaian target dan riil penjualan dari Penjual. Daftar Laporan category: Penjualan; view type `report`.

## Params

Date kind `ASOFYEAR`: `asOfYear` (integer year).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"asOfYear":2026,"selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

Header block: `Nama Target : <name>` | `S/d Tanggal : <date>`; `Dari Tanggal : <date>` | `Penganalisa : <name>`; then columns `Nama Tenaga Penjual | Nilai Target | Nilai Riil | Pencapaian (%)`.

## Row grouping

Empty: no sales target defined for 2026. Title `Target Penjualan Penjual`, subtitle `per 2026`.

Title lines: `Target Penjualan Penjual`, `per 2026`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified. Pencapaian (%) presumably Nilai Riil / Nilai Target x 100 (unverified; no data).

## Verified / unverified

- Verified: layout of the empty report (title, header cells where printed, footer).
- Unverified: all behavior; target definitions exist? not traced.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

