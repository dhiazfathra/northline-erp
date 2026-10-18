# Daftar Komisi Penjual (`SalesmanCommissionListReport`)

Group: Tenaga Penjual. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/SalesmanCommissionListReport.json`](captures/retail/SalesmanCommissionListReport.json).

Status: **verified** (Retail Demo) against [`fixtures/retail/salesman-rc.json`](fixtures/retail/salesman-rc.json), test `apps/api/test/salesman.test.ts` (ADR-0023). Earlier demo-data capture: [`captures/retail/SalesmanCommissionListReport.json`](captures/retail/SalesmanCommissionListReport.json).

## Purpose

Laporan yang berisi daftar perhitungan komisi untuk tenaga penjual. Daftar Laporan category: Tenaga Penjual; view type `report`.

## Params

Date kind `NONE`: none (no date parameter).

Params used for the capture (default over all history unless stated): `{}`

## Columns

`Nama` | `Berlaku pada` | `Dengan Syarat` | `Mendapatkan Komisi` | `Berlaku ke Penjual`

## Row grouping

One row per commission definition. Retail Demo: `Komisi Team` | `Semua Barang` | `Tanpa batasan dan syarat` | `7 % dari Nilai Penjualan` | `Urutan (DO NOT SHOW) Pertama, Kedua, Ketiga, Keempat dan Kelima`.

Title lines: `Daftar Komisi Penjual`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

Verified zero-diff on the NL-RC 2043 documents (as-of reports: NL-RC salesman blocks; the sandbox's 2016-17 Adam / Jhonni Haris rows and the totals that include them are not part of the fixture ledger).

- One row per rule, by name: `Semua Barang`, `Tanpa batasan dan syarat`, `<pct> % dari Nilai Penjualan`, and `Berlaku ke Penjual` = `Tenaga Penjual: <names joined with ", " and a final " dan ">` when the rule is limited to salesmen (glued to the next text without a space, as Accurate prints it) + `Urutan (DO NOT SHOW) ` + the levels (`Pertama`, `Kedua`, `Ketiga`, `Keempat`, `Kelima`) joined the same way.
- The `(DO NOT SHOW)` placeholder is printed verbatim: it is part of the compared output.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

