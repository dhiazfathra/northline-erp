# Retur Penjualan per Penjual (`SalesReturnListBySalesmanReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesReturnListBySalesmanReport.json`](captures/retail/SalesReturnListBySalesmanReport.json).

Status: **verified** (Retail Demo) against [`fixtures/retail/salesman-rc.json`](fixtures/retail/salesman-rc.json), test `apps/api/test/salesman.test.ts` (ADR-0023). Earlier demo-data capture: [`captures/retail/SalesReturnListBySalesmanReport.json`](captures/retail/SalesReturnListBySalesmanReport.json).

## Purpose

Menampilkan daftar retur penjualan grup per Penjual. Daftar Laporan category: Tenaga Penjual; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

`Nomor #` | `Tanggal` | `Pelanggan` | `Total`

## Row grouping

Empty: Retail Demo has no sales returns attributed to a salesman in the range (header `Nomor # | Tanggal | Pelanggan | Total` printed only).

Title lines: `Retur Penjualan per Penjual`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

Verified zero-diff on the NL-RC 2043 documents (as-of reports: NL-RC salesman blocks; the sandbox's 2016-17 Adam / Jhonni Haris rows and the totals that include them are not part of the fixture ledger).

- A return is listed under its document salesman, taken from the invoice lines it takes back (Accurate stores the salesman on the return line); SRT.2043.02.00001 returns the NL-RC Sales B line of SI.2043.02.00001 and is listed under NL-RC Sales B with 2,000,000, then a subtotal row.
- The demo returns of 2017 have no salesman on their header (`masterSalesman` null), which is why the demo capture was empty.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

