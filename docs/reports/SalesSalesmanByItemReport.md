# Penjualan Barang per Penjual (`SalesSalesmanByItemReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesSalesmanByItemReport.json`](captures/retail/SalesSalesmanByItemReport.json).

Status: blocked: requires Salesman on invoice.

## Purpose

Menampilkan nilai penjualan barang per penjual. Daftar Laporan category: Tenaga Penjual; view type `crosstab`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []
- `selectedSalesman`: SALESMAN_MULTI, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}],"selectedSalesman":[]}`

## Columns

No column header cells were printed: the capture holds only the title lines and footer (empty result). Expected by analogy: unknown (header not printed when empty); likely `Nama Barang | Kuantitas | Total` per salesman.

## Row grouping

Empty. Param `selectedSalesman=[]` (empty selection) may be the cause: the same empty-selection capture of [SerialNumberStockReport](SerialNumberStockReport.md) printed nothing while an explicit selection returned data. Unverified here (not re-run with a selected salesman).

Title lines: `Penjualan Barang per Penjual`, `Dari 01 Jan 2000 s/d 31 Des 2040`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified.

## Verified / unverified

- Verified: layout of the empty report (title, header cells where printed, footer).
- Unverified: layout, effect of empty `selectedSalesman`.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

