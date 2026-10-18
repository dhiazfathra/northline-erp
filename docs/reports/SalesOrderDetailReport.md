# Rincian Pesanan Penjualan (`SalesOrderDetailReport`)

Group: Penjualan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesOrderDetailReport.json`](captures/retail/SalesOrderDetailReport.json).

Status: existing module; spec + verify. Fixture: [`fixtures/retail/SalesOrderDetailReport.json`](fixtures/retail/SalesOrderDetailReport.json) (Retail Demo).

## Purpose

Laporan yang berisi rincian barang pada pesanan penjualan. Daftar Laporan category: Penjualan; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

Per-order block. Header: `Nomor # : <no>` | `Sub Total : <n>`; `Tanggal : <date>` | `Total Biaya : <n>`; `Pelanggan : <name>` | `Total : <n>`; `Mata Uang : <currency>` | `Nama Biaya : <charges>`. Line header: `Kode #` | `No. PO` | `Nama Barang` | `Kuantitas` | `@Harga` | `Total Harga`. Closing line: total quantity | total price.

## Row grouping

One block and one page per order (12 pages, `Halaman n dari 12`), orders ascending by number. Lines under each block; the closing line sums the order's lines.

Title lines: `Rincian Pesanan Penjualan`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Line total = quantity x @Harga (checked: 25 x 120,000 = 3,000,000; 20 x 10 = 200 SGD; 4 x 4,000,000 = 16,000,000).
- Total = Sub Total + tax: 11 of 11 IDR orders have Total = Sub Total x 1.1 (checked); `Total Biaya` is 0 on all 12.
- Closing line = sum of lines: SO.2016.12.00002 has lines 50 x 150,000 = 7,500,000 and 50 x 100,000 = 5,000,000, closing `100 | 12,500,000` (checked).

## Drill-down (ACC_DB=retail, read-only)

- Header values (sub total, total, customer, status) agree with `search-sales-order.do` (12 orders).

## Verified / unverified

- Verified: all 12 blocks' header and line arithmetic.
- Unverified: orders with `Nama Biaya` charges or discounts; multi-line `No. PO` placement.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

