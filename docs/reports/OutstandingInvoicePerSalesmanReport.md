# Faktur Belum Lunas per Penjual (`OutstandingInvoicePerSalesmanReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/OutstandingInvoicePerSalesmanReport.json`](captures/retail/OutstandingInvoicePerSalesmanReport.json).

Status: **verified** (Retail Demo) against [`fixtures/retail/salesman-rc.json`](fixtures/retail/salesman-rc.json), test `apps/api/test/salesman.test.ts` (ADR-0023). Earlier demo-data capture: [`captures/retail/OutstandingInvoicePerSalesmanReport.json`](captures/retail/OutstandingInvoicePerSalesmanReport.json).

## Purpose

Menampilkan faktur-faktur yang belum dilunasi grup per penjual. Daftar Laporan category: Tenaga Penjual; view type `report`.

## Params

Date kind `ASOF`: `asOfDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"asOfDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

`Nomor #` | `Tanggal` | `Jatuh Tempo` | `Pelanggan` | `Total` | `Piutang` | `Umur (hr)`

## Row grouping

Grouped by currency name (`Indonesian Rupiah`, `Singapore`, `US`) then by salesman; per salesman subtotal line (`Total | Piutang`). Header `Nomor # | Tanggal | Jatuh Tempo | Pelanggan | Total | Piutang | Umur (hr)`.

Title lines: `Faktur Belum Lunas per Penjual`, `Per Tgl. 31 Des 2040`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

Verified zero-diff on the NL-RC 2043 documents (as-of reports: NL-RC salesman blocks; the sandbox's 2016-17 Adam / Jhonni Haris rows and the totals that include them are not part of the fixture ledger).

- Open invoices are those whose **document salesman** is set: Accurate's `masterSalesman`, present only when every line carries the same salesmen (the NL-RC invoice SI.2043.02.00001, one line for NL-RC Sales B and one shared A+B line, appears under no salesman). Owing = total - receipts - returns dated on or before the as-of date; fully settled invoices drop out.
- Age counts from the **invoice date**, not the due date: SI.2043.06.00004 (25 Jun, due 25 Jul) is 36 days old at 31 Jul and sits in `31 - 60`; at 20 Jul it is 25 days old and sits in `1 - 30`, not `Blm Tempo`, although it is not yet due. Buckets: age <= 0 `Blm Tempo` (unobserved), 1-30, 31-60 (60 inclusive: SI.2043.06.00001 at 60 days), 61-90, 91-120.
- Foreign currency: amounts print in the invoice currency (the USD invoice SI.2043.04.00001 shows 1,000, not 15,000,000 IDR at rate 15,000) in its own currency block (sorted IDR, SGD, USD); salesmen sort by name within a block.
- `Umur (hr)` = as-of date - invoice date (SI.2043.06.00004: 36 although due 25 Jul). `Total` and `Piutang` in the invoice currency; salesman subtotal row `Total | Piutang`; rows sorted by date.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

