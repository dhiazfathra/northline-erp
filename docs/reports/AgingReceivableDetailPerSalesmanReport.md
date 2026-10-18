# Rincian Umur Piutang per Penjual (`AgingReceivableDetailPerSalesmanReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/AgingReceivableDetailPerSalesmanReport.json`](captures/retail/AgingReceivableDetailPerSalesmanReport.json).

Status: blocked: requires Salesman on invoice. Fixture: [`fixtures/retail/AgingReceivableDetailPerSalesmanReport.json`](fixtures/retail/AgingReceivableDetailPerSalesmanReport.json) (Retail Demo).

## Purpose

Menampilkan rincian transaksi atas umur dari piutang pelanggan per penjual. Daftar Laporan category: Tenaga Penjual; view type `report`.

## Params

Date kind `ASOF`: `asOfDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"asOfDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

`Nomor #` | `Tanggal` | `Pelanggan` | `Piutang` | `Blm Tempo` | `1 - 30` | `31 - 60` | `61 - 90` | `91 - 120`

## Row grouping

Grouped by currency then salesman, one row per open invoice (`Nomor # | Tanggal | Pelanggan | Piutang | Blm Tempo | 1 - 30 | 31 - 60 | 61 - 90 | 91 - 120`), subtotal line per salesman.

Title lines: `Rincian Umur Piutang per Penjual`, `Per Tgl. 31 Des 2040`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Invoice `Piutang` values equal [OutstandingInvoicePerSalesmanReport](OutstandingInvoicePerSalesmanReport.md) (checked: SI.2016.10.00004 6,000,000, SI.2016.11.00007 4,200,000, SI.2017.01.00006 37,950,000 ...).
- As in the summary aging report all bucket cells are 0 although Piutang > 0 (the `> 120` bucket is absent from the capture); subtotal lines show only bucket zeros (the Piutang subtotal cell is not in the capture row).

## Verified / unverified

- Verified: layout, header cells and the sums stated above, against the Retail Demo capture only.
- Unverified: bucket allocation for overdue ranges below 120 days; > 120 bucket; subtotal Piutang cell.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

