# Faktur Belum Lunas per Penjual (`OutstandingInvoicePerSalesmanReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/OutstandingInvoicePerSalesmanReport.json`](captures/retail/OutstandingInvoicePerSalesmanReport.json).

Status: blocked: requires Salesman on invoice. Fixture: [`fixtures/retail/OutstandingInvoicePerSalesmanReport.json`](fixtures/retail/OutstandingInvoicePerSalesmanReport.json) (Retail Demo).

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

- `Umur (hr)` = days from `Jatuh Tempo` to the as-of date: 11 Okt 2016 to 31 Des 2040 = 8,847 and 29 Jan 2017 = 8,737 (checked by date arithmetic). Due date equals invoice date (no payment terms).
- Subtotals: Adam Total 134,300,000 = 26,000,000 + 5,000,000 + 37,950,000 + 500,000 + 500,000 + 64,350,000 (checked) and Piutang 113,500,000 (checked). Jhonni Haris Total 437,050,000 = 20,350,000 + 4,200,000 + 170,500,000 + 26,000,000 + 216,000,000 (checked), Piutang 340,240,000 (checked).
- Only invoices with Piutang > 0 are listed; partly paid invoices show Total vs remaining Piutang (SI.2016.10.00004 26,000,000 / 6,000,000).

## Verified / unverified

- Verified: layout, header cells and the sums stated above, against the Retail Demo capture only.
- Unverified: sort order within salesman (descending number/date as printed: ascending by due date), as-of dates other than 2040, invoices with no salesman.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

