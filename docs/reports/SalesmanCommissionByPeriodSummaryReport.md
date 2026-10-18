# Ringkasan Komisi (Dihitung per Periode) (`SalesmanCommissionByPeriodSummaryReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesmanCommissionByPeriodSummaryReport.json`](captures/retail/SalesmanCommissionByPeriodSummaryReport.json).

Status: blocked: requires Salesman commission.

## Purpose

Laporan yang berisi daftar nilai komisi yang didapatkan oleh tiap-tiap Tenaga Penjual dengan cara perhitungan kumulatif per bulan. Daftar Laporan category: Tenaga Penjual; view type `report`.

## Params

Date kind `PERIOD`: `periodMonth`, `periodYear`.

Params used for the capture (default over all history unless stated): `{"periodMonth":"12","periodYear":2026}`

## Columns

`Nama Tenaga Penjual` | `Nilai Komisi`

## Row grouping

Empty for December 2026 (no commissions calculated per period). Header `Nama Tenaga Penjual | Nilai Komisi`; title `Ringkasan Komisi (Dihitung per Periode)`, subtitle `Per Desember 2026`.

Title lines: `Ringkasan Komisi (Dihitung per Periode)`, `Per Desember 2026`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified. Capture uses default period month 12 / year 2026, which has no data; period-based commissions are a different commission mode from the per-invoice mode in [SalesmanCommissionByInvoiceSummaryReport](SalesmanCommissionByInvoiceSummaryReport.md).

## Verified / unverified

- Verified: layout of the empty report (title, header cells where printed, footer).
- Unverified: all behavior; re-run for 2016/2017 would be needed.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

