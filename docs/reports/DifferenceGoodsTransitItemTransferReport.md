# Perbedaan Persediaan Terkirim Pemindahan Barang (`DifferenceGoodsTransitItemTransferReport`)

Group: Pemeriksaan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/DifferenceGoodsTransitItemTransferReport.json`](captures/retail/DifferenceGoodsTransitItemTransferReport.json).

Status: existing module; spec + verify.

## Purpose

Menampilkan daftar pindah barang yang sudah diproses namun jurnal akun persediaan terkirim ada perbedaan. Daftar Laporan category: Pemeriksaan; view type `report`.

## Params

Date kind `ASOF`: `asOfDate` (dd/MM/yyyy).

Params used for the capture (default over all history unless stated): `{"asOfDate":"31/12/2040"}`

## Columns

`Tanggal | No. Kirim # | No. Terima # | Selisih`

## Row grouping

Empty in Retail Demo, also when re-run with asOfDate 31/12/2016 (checked, 1 run). Title `Perbedaan Persediaan Terkirim Pemindahan Barang`, subtitle `Per Tgl. 31 Des 2040`.

Title lines: `Perbedaan Persediaan Terkirim Pemindahan Barang`, `Per Tgl. 31 Des 2040`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Surprising: Retail Demo has a 1-unit transfer shortfall (IT.2016.12.00001 sent 20, received 19), yet the report is empty. Hypothesis: it lists only value differences on goods in transit under a perpetual in-transit costing option that the sandbox does not use; unverified.

## Drill-down (ACC_DB=retail, read-only)

- Ran `report.mjs DifferenceGoodsTransitItemTransferReport '{"asOfDate":"31/12/2016"}'`: header only.
- The P&L (all history) has an account `Beban Selisih Nilai barang (Item Transfer)` 768,544.36 (see [ProfitLossByBranchReport](ProfitLossByBranchReport.md)), so transfer value differences are posted somewhere; not linked to this report.

## Verified / unverified

- Verified: empty output at two as-of dates.
- Unverified: layout with data, trigger conditions, whether the 768,544.36 relates.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

