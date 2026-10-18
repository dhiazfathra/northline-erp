# Faktur Penjualan per Penjual (`SalesInvoiceListBySalesmanReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesInvoiceListBySalesmanReport.json`](captures/retail/SalesInvoiceListBySalesmanReport.json).

Status: blocked: requires Salesman on invoice. Fixture: [`fixtures/retail/SalesInvoiceListBySalesmanReport.json`](fixtures/retail/SalesInvoiceListBySalesmanReport.json) (Retail Demo).

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

- Adam subtotal Total 2,635,978,165 vs sum of his 10 invoice totals 2,635,978,165 (checked); mixes IDR, SGD (12,000) and USD (66,165) unconverted.
- Pembayaran subtotal Adam 2,517,600,000 = 17,600,000 + 16,000,000 + 2,484,000,000 (checked).
- Piutang = Total - Pembayaran holds for simple invoices (SI.2017.02.00005 17,600,000 - 17,600,000 = 0; SI.2017.01.00010 64,350,000 - 0), but NOT in general: SI.2016.10.00004 26,000,000 - 16,000,000 = 10,000,000 vs printed 6,000,000; SI.2016.10.00005 26,000,000 - 0 vs 22,000,000; SI.2017.02.00003 1,925,000 - 0 vs 0. The gap is probably returns / down payments applied to the invoice (not traced; unverified). Foreign currency: 12,000 SGD invoice shows Piutang 7,200, 66,165 USD shows 60,150, again unexplained.
- Jhonni Haris subtotals checked: Total 446,410,460 is the sum of his 10 invoice totals and Pembayaran 7,424,730 = 6,600,000 + 814,000 + 10,730 (checked).

## Verified / unverified

- Verified: layout, header cells and the sums stated above, against the Retail Demo capture only.
- Unverified: Piutang subtotal cell (capture row has two cells), foreign-currency Piutang basis, the gap between Piutang and Total - Pembayaran; invoice SI.2017.02.00008 is dated 18 Nov 2016 while its number is 2017.02 (data quirk).

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

