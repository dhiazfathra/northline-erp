# Histori Transaksi per Penjual (`TransactionPerSalesmanListReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/TransactionPerSalesmanListReport.json`](captures/retail/TransactionPerSalesmanListReport.json).

Status: blocked: requires Salesman on invoice. Fixture: [`fixtures/retail/TransactionPerSalesmanListReport.json`](fixtures/retail/TransactionPerSalesmanListReport.json) (Retail Demo).

## Purpose

Menampilkan histori transaksi per Penjual. Daftar Laporan category: Tenaga Penjual; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

`Nama Pelanggan` | `Alamat` | `No. Transaksi` | `Nilai`

## Row grouping

Date heading (e.g. `10 Feb 2017`) then salesman name, then document-type sub-blocks (`Faktur Penjualan`, `Penerimaan Penjualan`, `Pesanan Penjualan`, ...) with rows `Nama Pelanggan | No. Transaksi | Nilai` and a subtotal per sub-block. Header `Nama Pelanggan | Alamat | No. Transaksi | Nilai` (`Alamat` blank). 177 captured rows.

Title lines: `Histori Transaksi per Penjual`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Example 10 Feb 2017, Adam: Faktur SI.2017.02.00005 17,600,000 equals invoice list value; SO.2017.02.00002 17,600,000 equals its sales order total (checked against [SalesOrderListReport](SalesOrderListReport.md)); receipt 33,600,000 has no matching invoice amount here (unverified).

## Verified / unverified

- Verified: layout, header cells and the sums stated above, against the Retail Demo capture only.
- Unverified: inclusion rules for document types, ordering of dates, receipts belonging to several invoices.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

