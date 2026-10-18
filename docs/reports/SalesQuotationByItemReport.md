# Penawaran per Barang (Belum Proses) (`SalesQuotationByItemReport`)

Group: Penjualan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesQuotationByItemReport.json`](captures/retail/SalesQuotationByItemReport.json).

Status: blocked: requires Sales Quotation.

## Purpose

Menampilkan nilai penawaran penjualan yang belum di proses per barang. Daftar Laporan category: Penjualan; view type `crosstab`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

No column header cells were printed: the capture holds only the title lines and footer (empty result). Expected by analogy: `Nama Barang` | `Kts` | `Kts Terproses` | `Total Harga`, by analogy with [SalesOrderByItemReport](SalesOrderByItemReport.md).

## Row grouping

Empty in Retail Demo. Retail Demo has 3 quotations (SQ.2016.12.00001, SQ.2016.12.00002, SQ.2017.02.00001), all status `Terproses` (converted to sales orders), so the `(Belum Proses)` reports print no rows. Filter line lists `Status Penawaran Penjualan, Ditutup, Ditutup manual` (those statuses are excluded).

Title lines: `Penawaran per Barang (Belum Proses)`, `Dari 01 Jan 2000 s/d 31 Des 2040`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified: by analogy, quantities and pre-tax `Total Harga` of unprocessed quotation lines.
- Retail Demo has 3 quotations (SQ.2016.12.00001, SQ.2016.12.00002, SQ.2017.02.00001), all status `Terproses` (converted to sales orders), so the `(Belum Proses)` reports print no rows.

## Verified / unverified

- Verified: empty-state layout.
- Unverified: layout with data.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

