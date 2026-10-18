# Pesanan per Barang (Belum Proses) (`SalesOrderByItemReport`)

Group: Penjualan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesOrderByItemReport.json`](captures/retail/SalesOrderByItemReport.json).

Status: existing module; spec + verify. Fixture: [`fixtures/retail/SalesOrderByItemReport.json`](fixtures/retail/SalesOrderByItemReport.json) (Retail Demo).

## Purpose

Menampilkan nilai pesanan penjualan yang belum di proses per barang. Daftar Laporan category: Penjualan; view type `crosstab`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

`Nama Barang Barang & Jasa` | `Kts (Unit#1)` | `Kts Terproses` | `Total Harga`

## Row grouping

One row per item/service with unprocessed order lines, then `Total Nama Barang Barang & Jasa`. Filter line excludes statuses `Pesanan Penjualan, Ditutup, Ditutup manual`.

Title lines: `Pesanan per Barang (Belum Proses)`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Cabang : [Semua Cabang], Filter berdasarkan : Status Pesanan Penjualan, Ditutup, Ditutup manual`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- `Kts` = ordered quantity, `Kts Terproses` = quantity already delivered/invoiced, `Total Harga` = pre-tax line total (Sub Total, not tax-inclusive: unlike the by-customer report).
- Per item vs [SalesOrderDetailReport](SalesOrderDetailReport.md) lines of unprocessed orders (checked): Hard Case 25 + 5 = 30, 3,000,000 + 600,000 = 3,600,000; Flexcable 25 + 10 = 35, 3,750,000 + 1,500,000 = 5,250,000; Anti Gores Iphone 6S Plus 5, 750,000; Charger Iphone 6 S 20, 200 (SGD, unconverted); Connecter 50, 10,000,000.
- `Kts Terproses` verified through `percentShipped`: SO.2016.11.00002 40% of 5 = 2 (Hard Case), SO.2016.10.00002 25% of 20 = 5 (Charger), SO.2017.01.00002 20% of 50 = 10 (Connecter); 0 + 5 + 10 + 0 + 2 = 17 (checked, equals total row).
- Terproses orders (e.g. Anti Gores Iphone 6, Iphone 5 64 GB) do not appear (checked: not in the list).
- Same SGD caveat: `Charger Iphone 6 S` total `200` is 200 SGD summed into an IDR total 19,600,200.
- Auto-check `Total Nama Barang Barang & Jasa` row (5 data rows): Kts (Unit#1): checked 5 rows sum 140 vs total 140; Kts Terproses: checked 5 rows sum 17 vs total 17; Total Harga: checked 5 rows sum 19,600,200 vs total 19,600,200.

## Drill-down (ACC_DB=retail, read-only)

- Sales-order search API gave `percentShipped` per order (see by-customer spec); detail lines taken from the detail capture.

## Verified / unverified

- Verified: all 5 rows and the total row, quantities, processed quantities.
- Unverified: sorting rule (alphabetical as printed), unit column when an item has multiple units.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

