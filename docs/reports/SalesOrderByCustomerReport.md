# Pesanan per Pelanggan (Belum Proses) (`SalesOrderByCustomerReport`)

Group: Penjualan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesOrderByCustomerReport.json`](captures/retail/SalesOrderByCustomerReport.json).

Status: verified (ADR-0027). Fixture: [`fixtures/retail/quotation-rd.json`](fixtures/retail/quotation-rd.json) (Retail Demo, NL-RD documents of 2044); test `apps/api/test/quotations.test.ts`, code `apps/api/src/reports/quotations.ts`.

## Purpose

Menampilkan nilai pesanan penjualan yang belum di proses per pelanggan. Daftar Laporan category: Penjualan; view type `crosstab`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

`Pelanggan` | `Total`

## Row grouping

One row per customer with unprocessed orders, then `Total Pelanggan`. Filter line `Cabang : [Semua Cabang], Filter berdasarkan : Status` (the status filter, not printed in detail, hides `Terproses` orders).

Title lines: `Pesanan per Pelanggan (Belum Proses)`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Cabang : [Semua Cabang], Filter berdasarkan : Status`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Rows list tax-inclusive order totals summed per customer. Customer sums (checked against [SalesOrderListReport](SalesOrderListReport.md)): PT Kapuk Kartika 4,125,000 + 660,000 = 4,785,000; PT Emas Sentosa 3,300,000; PT Titik Terang 825,000; PT Sinar Bumi 1,650,000; Pelanggan Umum - Surabaya 11,000,000 (only SO.2017.01.00002, since SO.2017.01.00003 is Terproses).
- Only orders with status `Menunggu diproses` and `Sebagian diproses` are included; the 5 `Terproses` orders (13,750,000 + 25,960,000 + 4,675,000 + 1,925,000 + 17,600,000) are excluded: checked: the 7 included orders 3,300,000 + 220 + 4,125,000 + 825,000 + 660,000 + 1,650,000 + 11,000,000 sum to the printed total 21,560,220.
- Partially processed orders count in full (SO.2016.11.00002 660,000 even though 40% shipped): total is not reduced by the processed share.
- Foreign currency is NOT converted: PT Galaxy Phone's Singapore Dollar order (220 SGD) is added as `220` to the IDR customer rows and total. Surprising; compare Manufaktur Demo if it has foreign-currency orders.
- Auto-check `Total Pelanggan` row (6 data rows): Total: checked 6 rows sum 21,560,220 vs total 21,560,220.

## Drill-down (ACC_DB=retail, read-only)

- `search-sales-order.do` returned 12 orders (rowCount 12) matching the 12 list rows; status and `percentShipped` per order: Menunggu diproses = 0%, Sebagian diproses = 20/25/40%, Terproses = 100%.
- `search-sales-order.do` SO.2016.10.00002 has `subTotal` 200 and exact total 219.999958 (SGD, exchange-rate rounding) printed as `220`.

## Verified / unverified

- Verified: every row and the total, against the SO list/detail captures and the sales-order search API.
- Unverified: effect of `Status` filter values other than the default; rounding of foreign-currency totals beyond 2 dp.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

## NL-RD verification

Zero diff over 01/01/2044-31/12/2044 against the NL-RD capture (5 quotations, 5 orders, 4 orders taken from quotation lines, 3 invoices billing order lines; statuses Menunggu / Sebagian / Terproses all present). Confirmed: status and Kts Terproses come from line links (quotation line -> order line -> invoice line); the (Belum Proses) per-customer reports keep partly processed documents at full total; the per-item reports drop lines already fully processed (SQ.2044.03.00002 line 1) and label the column `Nama Barang` for quotations. Untaxed only (sandbox PPN 10% is refused after April 2022); No. PO, charges, delivery orders and foreign currency not exercised.
