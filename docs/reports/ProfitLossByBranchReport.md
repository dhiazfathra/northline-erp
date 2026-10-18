# Laba/Rugi Cabang (`ProfitLossByBranchReport`)

Group: Keuangan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/ProfitLossByBranchReport.json`](captures/retail/ProfitLossByBranchReport.json).

Status: verified (Retail Demo, ADR-0022). Fixture: [`fixtures/retail/dimensions-ra.json`](fixtures/retail/dimensions-ra.json); test `apps/api/test/dimensions.test.ts`.

## Purpose

Menampilkan laba rugi dari cabang-cabang untuk periode yg dipilih. Daftar Laporan category: Keuangan; view type `financialstatement`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []
- Booleans: `showTotal` (default false), `showParentAccount` (default true), `showChildAccount` (default true), `showZeroBalance` (default false), `showParentAccountBalance` (default true)

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}],"showTotal":false,"showParentAccount":true,"showChildAccount":true,"showZeroBalance":false,"showParentAccountBalance":true}`

## Columns

`Deskripsi` | one column per branch (by name) | `Total`

## Row grouping

Seed (Retail Demo, 2041, all `NL-RA`): departments NL-RA-D1/D2, project NL-RA-P1 (P.00001), Jurnal Umum J1–J7 (JV.2041.02.00001 … JV.2041.09.00001) over branches JAKARTA and SURABAYA, with one line in a project, lines in each department and lines with no department (J5, every cash line). Params of the capture: `{"startDate": "01/01/2041", "endDate": "31/12/2041", "selectedBranch": [{"name": "[Semua Cabang]", "id": null}], "showTotal": false, "showParentAccount": true, "showChildAccount": true, "showZeroBalance": false, "showParentAccountBalance": true}`.

## Calculation rules

- Each amount column is the standard Laba/Rugi ([ProfitLossStandardReport](ProfitLossStandardReport.md)) computed over only the journal lines of that column, with zero rows kept so the columns align; an account row hides only when it is zero in every column (`showZeroBalance=false`). Headings and `Jumlah ...` rows always print.
- Retail Demo ends with two rows `LABA BERSIH (Sebelum Pajak)` and `LABA BERSIH (Setelah Pajak)`, both equal to the net profit (no income-tax line is modelled).
- Numbers print en-US (`1,650,000.5`), negatives with a leading `-`.
- A column takes the lines of journals whose header branch is that branch; a journal without a branch belongs to the default branch (JAKARTA in Retail Demo).
- Total = sum of the branch columns on every row (2041: Beban Alat Tulis Kantor 1,650,000.5 = J3 1,250,000.5 + J5 400,000, all JAKARTA).

## Verified / unverified

- Verified: zero diff on every body row against the 2041 capture ([`fixtures/retail/dimensions-ra.json`](fixtures/retail/dimensions-ra.json), test `apps/api/test/dimensions.test.ts`); page furniture (title lines, footer, repeated header) is stripped before comparing.
- Unverified: branch filter other than `[Semua Cabang]`, data classification filters, foreign-currency accounts.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).
- Capture spans 3 pages (`Halaman n dari 3`); the column header row repeats on every page.
