# Rincian Komisi Penjual (Dihitung per Periode) (`SalesmanCommissionByPeriodDetailReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesmanCommissionByPeriodDetailReport.json`](captures/retail/SalesmanCommissionByPeriodDetailReport.json).

Status: blocked: requires Salesman commission.

## Purpose

Laporan yang berisi rincian perhitungan nilai komisi bulanan yang didapatkan Tenaga Penjual. Daftar Laporan category: Tenaga Penjual; view type `report`.

## Params

Date kind `PERIOD`: `periodMonth`, `periodYear`.

Params used for the capture (default over all history unless stated): `{"periodMonth":"12","periodYear":2026}`

## Columns

`Nama Komisi Penjual` | `Permeriksaan syarat` | `Nilai Komisi`

## Row grouping

Empty for December 2026. Header `Nama Komisi Penjual | Permeriksaan syarat | Nilai Komisi` (the Indonesian typo `Permeriksaan` is Accurate's). Title `Rincian Komisi Penjual (Dihitung per Periode)`.

Title lines: `Rincian Komisi Penjual (Dihitung per Periode)`, `Per Desember 2026`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified; see [SalesmanCommissionByInvoiceDetailReport](SalesmanCommissionByInvoiceDetailReport.md) for the per-invoice layout.

## Verified / unverified

- Verified: layout of the empty report (title, header cells where printed, footer).
- Unverified: all behavior.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

