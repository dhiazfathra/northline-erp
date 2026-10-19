# Daftar Penawaran Penjualan (`SalesQuotationListReport`)

Group: Penjualan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesQuotationListReport.json`](captures/retail/SalesQuotationListReport.json).

Status: verified (ADR-0027). Fixture: [`fixtures/retail/quotation-rd.json`](fixtures/retail/quotation-rd.json) (Retail Demo, NL-RD documents of 2044); test `apps/api/test/quotations.test.ts`, code `apps/api/src/reports/quotations.ts`.

## Purpose

Laporan yang berisi daftar penawaran penjualan. Daftar Laporan category: Penjualan; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

`Nomor #` | `Tanggal` | `Pelanggan` | `Total` | `Status`

## Row grouping

Flat list sorted by quotation number ascending (as printed), no subtotal row. Status values seen: `Terproses`.

Title lines: `Daftar Penawaran Penjualan`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- `Total` is tax-inclusive: the three quotations equal their converted sales orders in [SalesOrderListReport](SalesOrderListReport.md): SQ.2016.12.00001 13,750,000 = SO.2016.12.00002, SQ.2016.12.00002 25,960,000 = SO.2016.12.00003, SQ.2017.02.00001 1,925,000 = SO.2017.02.00001 (checked: amounts identical).
- No total row is printed.

## Verified / unverified

- Verified: layout, 3 rows, amounts against the sales order list.
- Unverified: statuses other than `Terproses` (assumed `Menunggu diproses` / `Sebagian diproses` as for sales orders); sorting rule.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

## NL-RD verification

Zero diff over 01/01/2044-31/12/2044 against the NL-RD capture (5 quotations, 5 orders, 4 orders taken from quotation lines, 3 invoices billing order lines; statuses Menunggu / Sebagian / Terproses all present). Confirmed: status and Kts Terproses come from line links (quotation line -> order line -> invoice line); the (Belum Proses) per-customer reports keep partly processed documents at full total; the per-item reports drop lines already fully processed (SQ.2044.03.00002 line 1) and label the column `Nama Barang` for quotations. Untaxed only (sandbox PPN 10% is refused after April 2022); No. PO, charges, delivery orders and foreign currency not exercised.
