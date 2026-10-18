# Penjualan Barang per Penjual (`SalesSalesmanByItemReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesSalesmanByItemReport.json`](captures/retail/SalesSalesmanByItemReport.json).

Status: **verified** (Retail Demo) against [`fixtures/retail/salesman-rc.json`](fixtures/retail/salesman-rc.json), test `apps/api/test/salesman.test.ts` (ADR-0023). Earlier demo-data capture: [`captures/retail/SalesSalesmanByItemReport.json`](captures/retail/SalesSalesmanByItemReport.json).

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

Verified zero-diff on the NL-RC 2043 documents (as-of reports: NL-RC salesman blocks; the sandbox's 2016-17 Adam / Jhonni Haris rows and the totals that include them are not part of the fixture ledger).

- Needs an explicit salesman selection: with `selectedSalesman=[]` the report prints nothing (demo capture); with both NL-RC salesmen selected it prints `Nama Penjual | Nama Barang | Kts (Unit#1) | Penjualan`.
- Every salesman on an invoice line (any level) is credited the **whole** line: the shared A+B line of SI.2043.02.00001 (1 x 2,000,000) counts in full for both. Value = line total in IDR before tax (the USD line 1,000 x 15,000 counts 15,000,000). Returns are **not** deducted.
- Per salesman (by name) one row per item name (salesman name on the first), `Total Nama Barang`, and a final `Total Nama Penjual`. Branch/salesman selection is printed on the `Cabang :` line.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

