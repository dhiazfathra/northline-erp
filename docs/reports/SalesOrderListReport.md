# Daftar Pesanan Penjualan (`SalesOrderListReport`)

Group: Penjualan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesOrderListReport.json`](captures/retail/SalesOrderListReport.json).

Status: existing module; spec + verify. Fixture: [`fixtures/retail/SalesOrderListReport.json`](fixtures/retail/SalesOrderListReport.json) (Retail Demo).

## Purpose

Laporan yang berisi daftar pesanan penjualan. Daftar Laporan category: Penjualan; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

`Nomor #` | `No. PO` | `Tanggal` | `Pelanggan` | `Total` | `Status`

## Row grouping

Flat list sorted by order date ascending, no total row (sum of all 12 orders would be 85,470,220, not printed). Status values: `Menunggu diproses` (0% shipped), `Sebagian diproses` (partial), `Terproses` (100%). `No. PO` is blank on most orders (capture drops the empty cell, so those rows have one cell less).

Title lines: `Daftar Pesanan Penjualan`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- `Total` is tax-inclusive: for the 11 IDR orders Sub Total x 1.1 = Total (checked: 11 of 11 from [SalesOrderDetailReport](SalesOrderDetailReport.md)); PPN is 10% in this data.
- Singapore Dollar order SO.2016.10.00002: Sub Total 200, Total printed 220 (exact 219.999958 per sales-order search API).

## Drill-down (ACC_DB=retail, read-only)

- `search-sales-order.do` rowCount 12 = 12 list rows; per-order status and totals agree with the report (checked for all 12: numbers, statuses derived from `percentShipped`).

## Verified / unverified

- Verified: 12 rows, statuses, totals against search API and detail report.
- Unverified: No. PO placement for blank cells, other statuses (closed/ditutup).

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

