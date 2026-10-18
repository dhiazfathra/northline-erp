# Check In per Karyawan (`SalesCheckInPerSalesmanReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesCheckInPerSalesmanReport.json`](captures/retail/SalesCheckInPerSalesmanReport.json).

Status: **verified** (Retail Demo) against [`fixtures/retail/salesman-rc.json`](fixtures/retail/salesman-rc.json), test `apps/api/test/salesman.test.ts` (ADR-0023). Earlier demo-data capture: [`captures/retail/SalesCheckInPerSalesmanReport.json`](captures/retail/SalesCheckInPerSalesmanReport.json).

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

Verified zero-diff on the NL-RC 2043 documents (as-of reports: NL-RC salesman blocks; the sandbox's 2016-17 Adam / Jhonni Haris rows and the totals that include them are not part of the fixture ledger).

- Check-ins come only from the Accurate mobile sales app. The web module (`accurate__customer__sales-check-in`) is read-only (`canAddNew = false`, no save URL; only `search-`/`detail-sales-check-in.do`), and the only create path is the public API, which requires an OAuth bearer token (`/accurate/api/...` returns "Authorization HTTP Header is required"). No check-in could be created in the sandbox.
- Verified on layout only: the ERP stores check-ins (`sales_check_ins`, fed by an import) and prints the empty 2043 report identically. Row layout with data (implemented as a salesman name line then `Tanggal | Alamat | Nama Pelanggan | Nomor Hp | Nama Kontak | No. Transaksi`) is unverified.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

