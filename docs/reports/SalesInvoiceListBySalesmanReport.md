# Faktur Penjualan per Penjual (`SalesInvoiceListBySalesmanReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesInvoiceListBySalesmanReport.json`](captures/retail/SalesInvoiceListBySalesmanReport.json).

Status: **verified** (Retail Demo) against [`fixtures/retail/salesman-rc.json`](fixtures/retail/salesman-rc.json), test `apps/api/test/salesman.test.ts` (ADR-0023). Earlier demo-data capture: [`captures/retail/SalesInvoiceListBySalesmanReport.json`](captures/retail/SalesInvoiceListBySalesmanReport.json).

## Purpose

Menampilkan daftar faktur penjualan grup per Penjual. Daftar Laporan category: Tenaga Penjual; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

`Nomor #` | `Tanggal` | `Pelanggan` | `Total` | `Pembayaran` | `Piutang`

## Row grouping

One block per salesman (name line), invoices sorted by date descending, then a subtotal line (Total, Pembayaran). Header `Nomor # | Tanggal | Pelanggan | Total | Pembayaran | Piutang`.

Title lines: `Faktur Penjualan per Penjual`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

Verified zero-diff on the NL-RC 2043 documents (as-of reports: NL-RC salesman blocks; the sandbox's 2016-17 Adam / Jhonni Haris rows and the totals that include them are not part of the fixture ledger).

- Invoices dated in the range, grouped by the document salesman (see [AgingReceivablePerSalesmanReport](AgingReceivablePerSalesmanReport.md): an invoice whose lines carry different salesmen is not listed), salesmen by name, invoices newest first.
- `Pembayaran` = receipts against the invoice up to the end date; `Piutang` = Total - Pembayaran - returns (this is the gap noted on the demo data: SI.2016.10.00004 has returns/receipts beyond the list column).
- Foreign invoices print in their own currency; the salesman subtotal (`Total`, `Pembayaran` only) adds currencies unconverted (NL-RC Sales B 3,401,000 = 3,400,000 IDR + 1,000 USD).

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

