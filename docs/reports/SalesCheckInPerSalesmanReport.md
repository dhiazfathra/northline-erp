# Check In per Karyawan (`SalesCheckInPerSalesmanReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesCheckInPerSalesmanReport.json`](captures/retail/SalesCheckInPerSalesmanReport.json).

Status: blocked: requires Salesman check-in (mobile).

## Purpose

Menampilkan rincian data check in per karyawan, pada tanggal dan karyawan yang dipilih. Daftar Laporan category: Tenaga Penjual; view type `report`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

`Tanggal` | `Alamat` | `Nama Pelanggan (Saat Check In)` | `Nomor Hp` | `Nama Kontak` | `No. Transaksi`

## Row grouping

Empty: no check-ins (mobile sales app) in Retail Demo. Header `Tanggal | Alamat | Nama Pelanggan (Saat Check In) | Nomor Hp | Nama Kontak | No. Transaksi`.

Title lines: `Check In per Karyawan`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Unverified.

## Verified / unverified

- Verified: layout of the empty report (title, header cells where printed, footer).
- Unverified: all behavior.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

