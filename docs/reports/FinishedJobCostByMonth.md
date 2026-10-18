# Penyelesaian Barang/Biaya per Bulan (`FinishedJobCostByMonth`)

Group: Pekerjaan Pesanan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/FinishedJobCostByMonth.json`](captures/retail/FinishedJobCostByMonth.json).

Status: **verified** (zero diff on the Retail Demo 2047 seed; ADR-0026). Fixture: [`fixtures/retail/jobcosting-rg.json`](fixtures/retail/jobcosting-rg.json). ERP: `finishedJobCostByMonth` in `apps/api/src/reports/job-costing.ts`; test: `apps/api/test/job-costing.test.ts`.

## Purpose

Laporan penyelesaian barang dan biaya pekerjaan pesanan. Daftar Laporan category: Pekerjaan Pesanan; view type `crosstab`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

`Keterangan` then per month and `Total Bulan` with sub-columns `Kuantitas | Nilai Total`.

## Row grouping

One row per finished item (`Iphone 5 64 GB + Antigores`), `Total Keterangan` row; months newest first.

Title lines: `Penyelesaian Barang/Biaya per Bulan`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Total row = single item row: Jan 2017 98 / 942,126,946.31, Des 2016 1 / 3,847,500, total 99 / 945,974,446.31 (checked: 942,126,946.31 + 3,847,500 = 945,974,446.31).
- Dec 2016 finished value 3,847,500 matches the `Penyelesaian Pesanan` line in [JobCostingHistoryDetailReport](JobCostingHistoryDetailReport.md) (checked).
- Finished value differs from material cost in [JobCostingByMonthReport](JobCostingByMonthReport.md) (Jan: 942,126,946.31 vs 635,720,816.89): unverified why.

## Verified / unverified

NL-RG seed (2047, fixture above):
- Rows are dated by the Penyelesaian Pesanan date (Feb 2047 for NL-RG-RO1, while the job order is Jan 2047); value = allocated job total (checked: 55,000).

Demo capture:

- Verified: layout, header cells and the sums stated above, against the Retail Demo capture only.
- Unverified: valuation method of finished goods.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

