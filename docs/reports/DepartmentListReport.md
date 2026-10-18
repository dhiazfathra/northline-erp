# Daftar Departemen (`DepartmentListReport`)

Group: Lain-lain. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/DepartmentListReport.json`](captures/retail/DepartmentListReport.json).

Status: verified (Retail Demo, ADR-0022). Fixture: [`fixtures/retail/dimensions-ra.json`](fixtures/retail/dimensions-ra.json); test `apps/api/test/dimensions.test.ts`.

## Purpose

Laporan yang berisi departemen. Daftar Laporan category: Lain-lain; view type `report`.

## Params

Date kind `NONE`: none (no date parameter).

Params used for the capture (default over all history unless stated): `{}`

## Columns

`Nama` | `Keterangan`

## Row grouping

Seed (Retail Demo, 2041, all `NL-RA`): departments NL-RA-D1/D2, project NL-RA-P1 (P.00001), Jurnal Umum J1–J7 (JV.2041.02.00001 … JV.2041.09.00001) over branches JAKARTA and SURABAYA, with one line in a project, lines in each department and lines with no department (J5, every cash line). Params of the capture: `{}`.

## Calculation rules

- Every department, ordered by name; an empty description prints nothing (the row is one cell).

## Verified / unverified

- Verified: zero diff on every body row against the 2041 capture ([`fixtures/retail/dimensions-ra.json`](fixtures/retail/dimensions-ra.json), test `apps/api/test/dimensions.test.ts`); page furniture (title lines, footer, repeated header) is stripped before comparing.
- Unverified: branch filter other than `[Semua Cabang]`, data classification filters, foreign-currency accounts.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

