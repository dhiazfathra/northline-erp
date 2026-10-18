# Histori Transaksi per Penjual (`TransactionPerSalesmanListReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/TransactionPerSalesmanListReport.json`](captures/retail/TransactionPerSalesmanListReport.json).

Status: **verified** (Retail Demo) against [`fixtures/retail/salesman-rc.json`](fixtures/retail/salesman-rc.json), test `apps/api/test/salesman.test.ts` (ADR-0023). Earlier demo-data capture: [`captures/retail/TransactionPerSalesmanListReport.json`](captures/retail/TransactionPerSalesmanListReport.json).

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

Verified zero-diff on the NL-RC 2043 documents (as-of reports: NL-RC salesman blocks; the sandbox's 2016-17 Adam / Jhonni Haris rows and the totals that include them are not part of the fixture ledger).

- Per date (newest first), per salesman (by name), document-type blocks (`Faktur Penjualan`, `Penerimaan Penjualan`; demo data also shows orders, deliveries and quotations, which the ERP does not tie to salesmen) with rows `Nama Pelanggan | Alamat | No. Transaksi | Nilai` and a subtotal; empty cells (Alamat) are omitted.
- An invoice is listed under every salesman on any of its lines (SI.2043.02.00001 under both). A receipt is listed under every salesman of the invoices it pays, at the **receipt total** (111.101-02.2043.03.00002 4,900,000 under both NL-RC salesmen). Returns are not listed.
- Foreign invoices show their own-currency total (1,000 USD).

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

