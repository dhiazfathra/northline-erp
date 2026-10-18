# Target Penjualan Penjual (`SalesmanSalesTargetReport`)

Group: Penjualan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesmanSalesTargetReport.json`](captures/retail/SalesmanSalesTargetReport.json).

Status: **verified** (Retail Demo) against [`fixtures/retail/salesman-rc.json`](fixtures/retail/salesman-rc.json), test `apps/api/test/salesman.test.ts` (ADR-0023). Earlier demo-data capture: [`captures/retail/SalesmanSalesTargetReport.json`](captures/retail/SalesmanSalesTargetReport.json).

## Purpose

Menampilkan capaian target dan riil penjualan dari Penjual. Daftar Laporan category: Penjualan; view type `report`.

## Params

Date kind `ASOFYEAR`: `asOfYear` (integer year).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"asOfYear":2026,"selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

Header block: `Nama Target : <name>` | `S/d Tanggal : <date>`; `Dari Tanggal : <date>` | `Penganalisa : <name>`; then columns `Nama Tenaga Penjual | Nilai Target | Nilai Riil | Pencapaian (%)`.

## Row grouping

Empty: no sales target defined for 2026. Title `Target Penjualan Penjual`, subtitle `per 2026`.

Title lines: `Target Penjualan Penjual`, `per 2026`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

Verified zero-diff on the NL-RC 2043 documents (as-of reports: NL-RC salesman blocks; the sandbox's 2016-17 Adam / Jhonni Haris rows and the totals that include them are not part of the fixture ledger).

- Target Penjualan of type Per Penjual (SALESMAN_TARGET) for the year: header block, then `Nama Tenaga Penjual | Nilai Target | Nilai Riil | Pencapaian (%)` and a total row (target, riil).
- Nilai Riil = lines carrying the salesman (any level, whole line, IDR before tax) on invoices dated in the target range, **less** returned lines of that salesman dated in the range: NL-RC Sales B 24,400,000 - 2,000,000 = 22,400,000.
- Pencapaian = riil / target x 100, up to two decimals, en-US (115.33, 448).

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

