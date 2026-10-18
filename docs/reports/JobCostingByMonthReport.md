# Bahan dan Biaya Pekerjaan per Bulan (`JobCostingByMonthReport`)

Group: Pekerjaan Pesanan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/JobCostingByMonthReport.json`](captures/retail/JobCostingByMonthReport.json).

Status: blocked: requires Job Costing (out of scope, ADR-0010). Fixture: [`fixtures/retail/JobCostingByMonthReport.json`](fixtures/retail/JobCostingByMonthReport.json) (Retail Demo).

## Purpose

Laporan data bahan dan biaya pekerjaan pesanan per bulan. Daftar Laporan category: Pekerjaan Pesanan; view type `crosstab`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

`Bahan dan Biaya` then per month (`Jan 2017`, `Des 2016`) and `Total Bulan`, each with sub-columns `Kuantitas | Biaya`.

## Row grouping

Rows per material/cost item, `Total Bahan dan Biaya` row; months in descending order (newest first).

Title lines: `Bahan dan Biaya Pekerjaan per Bulan`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Row sums: Anti Gores Iphone 5 98 + 1 = 99, 4,655,000 + 47,500 = 4,702,500; Iphone 5 64 GB 98 + 1 = 99, 631,065,816.89 + 6,439,447.11 = 637,505,264 (checked).
- Total row: Jan 2017 196 units, 635,720,816.89 = 4,655,000 + 631,065,816.89; Des 2016 2, 6,486,947.11; Total 198, 642,207,764 (checked).
- Month totals equal the debit to `Persediaan Dalam Proses` in [JobCostingJournalDetailReport](JobCostingJournalDetailReport.md): Dec 6,486,947.11, Jan 635,720,816.89 (checked).

## Verified / unverified

- Verified: layout, header cells and the sums stated above, against the Retail Demo capture only.
- Unverified: months with no data (omitted or zero), costs of non-inventory expense items (none in data).

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

