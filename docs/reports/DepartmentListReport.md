# Daftar Departemen (`DepartmentListReport`)

Group: Lain-lain. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/DepartmentListReport.json`](captures/retail/DepartmentListReport.json).

Status: blocked: requires Department. Fixture: [`fixtures/retail/DepartmentListReport.json`](fixtures/retail/DepartmentListReport.json) (Retail Demo).

## Purpose

Laporan yang berisi departemen. Daftar Laporan category: Lain-lain; view type `report`.

## Params

Date kind `NONE`: none (no date parameter).

Params used for the capture (default over all history unless stated): `{}`

## Columns

`Nama | Keterangan`

## Row grouping

One row per department, no total: `Accounting`, `Head Office` (`Keterangan` Head Office), `Opersional` (misspelling kept). Empty description cells are omitted in the capture, so only Head Office has two cells.

Title lines: `Daftar Departemen`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Matches the 3 departments (Accounting id 105, Head Office 101, Opersional 103) used by the department P&L reports (checked).

## Verified / unverified

- Verified: 3 rows against the known department list.
- Unverified: sort rule (as printed: Accounting, Head Office, Opersional, alphabetical), suspended departments.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

