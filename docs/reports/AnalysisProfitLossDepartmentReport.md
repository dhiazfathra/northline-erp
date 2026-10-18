# Analisa Laba/Rugi Departemen (`AnalysisProfitLossDepartmentReport`)

Group: Pusat Laba & Biaya. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/AnalysisProfitLossDepartmentReport.json`](captures/retail/AnalysisProfitLossDepartmentReport.json).

Status: verified (Retail Demo, ADR-0022). Fixture: [`fixtures/retail/dimensions-ra.json`](fixtures/retail/dimensions-ra.json); test `apps/api/test/dimensions.test.ts`.

## Purpose

Laporan yang menampilkan analisa laba/rugi departemen. Daftar Laporan category: Pusat Laba & Biaya; view type `crosstab`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

`Nama Departemen` | `Pendapatan` | `BPP` | `Beban` | `Laba/Rugi`

## Row grouping

Seed (Retail Demo, 2041, all `NL-RA`): departments NL-RA-D1/D2, project NL-RA-P1 (P.00001), Jurnal Umum J1–J7 (JV.2041.02.00001 … JV.2041.09.00001) over branches JAKARTA and SURABAYA, with one line in a project, lines in each department and lines with no department (J5, every cash line). Params of the capture: `{"startDate": "01/01/2041", "endDate": "31/12/2041", "selectedBranch": [{"name": "[Semua Cabang]", "id": null}]}`.

## Calculation rules

- One row per department with profit-and-loss activity in the range, ordered by name; departments without activity are not printed.
- Then `[Tanpa Departement]` for lines with no department (only when there are any), then `Total Nama Departemen` over all lines. Accurate prints blank spacer rows around the last two; the capture drops empty rows.
- Pendapatan = revenue + other income (credit − debit); BPP = COGS; Beban = operating + non-operating expense (debit − credit); Laba/Rugi = Pendapatan − BPP − Beban.
- 2041: NL-RA-D1 Pendapatan 6,300,000 = J1 6,000,000 + J6 other income 300,000; `[Tanpa Departement]` Beban 400,000 = J5.

## Verified / unverified

- Verified: zero diff on every body row against the 2041 capture ([`fixtures/retail/dimensions-ra.json`](fixtures/retail/dimensions-ra.json), test `apps/api/test/dimensions.test.ts`); page furniture (title lines, footer, repeated header) is stripped before comparing.
- Unverified: branch filter other than `[Semua Cabang]`, data classification filters, foreign-currency accounts.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

