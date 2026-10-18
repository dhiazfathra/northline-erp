# Laba/Rugi Departemen (Perbandingan Periode) (`ProfitLossComparePeriodPerDepartmentReport`)

Group: Pusat Laba & Biaya. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/ProfitLossComparePeriodPerDepartmentReport.json`](captures/retail/ProfitLossComparePeriodPerDepartmentReport.json).

Status: verified (Retail Demo, ADR-0022). Fixture: [`fixtures/retail/dimensions-ra.json`](fixtures/retail/dimensions-ra.json); test `apps/api/test/dimensions.test.ts`.

## Purpose

Menampilkan laba rugi per Departemen dibandingkan dengan periode lalu dari selisihnya ditampilkan dengan persentase. Daftar Laporan category: Pusat Laba & Biaya; view type `financialstatement`.

## Params

Date kind `COMPAREFROMTO`: `startDate`, `endDate` (base), `startDateCompare`, `endDateCompare` (dd/MM/yyyy).
- `selectedBranch`: PER_BRANCH, default []
- `selectedDepartment`: PER_DEPARTMENT, default []
- `selectedCurrency`: IN_CURRENCY, default []
- Booleans: `showTotal` (default false), `showParentAccount` (default true), `showChildAccount` (default true), `showZeroBalance` (default false), `showParentAccountBalance` (default true)

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2025","endDate":"31/12/2025","compareStartDate":"01/01/2026","compareEndDate":"31/12/2026","showTotal":false,"showParentAccount":true,"showChildAccount":true,"showZeroBalance":false,"showParentAccountBalance":true}`

Accepted wire shape (found 2026-10-19 from `init-report-input.do` defaults and the server's own errors): Date keys are `startDate`/`endDate` and `startDateCompare`/`endDateCompare` (not `compareStartDate`); `selectedDepartment` is a list `[{id, name}]`.

## Columns

`Deskripsi` | base period (`1 Jan - 31 Mar 2041`) | compare period (`1 Apr - 31 Des 2041`) | `Variance` | `% Var.`

## Row grouping

Seed (Retail Demo, 2041, all `NL-RA`): departments NL-RA-D1/D2, project NL-RA-P1 (P.00001), Jurnal Umum J1–J7 (JV.2041.02.00001 … JV.2041.09.00001) over branches JAKARTA and SURABAYA, with one line in a project, lines in each department and lines with no department (J5, every cash line). Params of the capture: `{"endDateCompare": "31/12/2041", "endDate": "31/03/2041", "showChildAccount": true, "startDateCompare": "01/04/2041", "showParentAccountBalance": true, "showTotal": false, "selectedDepartment": [{"id": 101850, "name": "NL-RA-D1"}], "showZeroBalance": false, "showParentAccount": true, "startDate": "01/01/2041", "selectedBranch": [{"name": "[Semua Cabang]", "id": null}]}`.

## Calculation rules

- Each amount column is the standard Laba/Rugi ([ProfitLossStandardReport](ProfitLossStandardReport.md)) computed over only the journal lines of that column, with zero rows kept so the columns align; an account row hides only when it is zero in every column (`showZeroBalance=false`). Headings and `Jumlah ...` rows always print.
- Retail Demo ends with two rows `LABA BERSIH (Sebelum Pajak)` and `LABA BERSIH (Setelah Pajak)`, both equal to the net profit (no income-tax line is modelled).
- Numbers print en-US (`1,650,000.5`), negatives with a leading `-`.
- One department; both periods over that department's lines only.
- Variance = compare − base; `% Var.` = Variance / |base| × 100 rounded to 2 decimals with a decimal comma (`-109,47 %`); `100 %` when base is 0 and variance is not, `0 %` when both are 0 (same as [ProfitLossComparePeriodReport](ProfitLossComparePeriodReport.md)).

## Verified / unverified

- Verified: zero diff on every body row against the 2041 capture ([`fixtures/retail/dimensions-ra.json`](fixtures/retail/dimensions-ra.json), test `apps/api/test/dimensions.test.ts`); page furniture (title lines, footer, repeated header) is stripped before comparing.
- Unverified: branch filter other than `[Semua Cabang]`, data classification filters, foreign-currency accounts.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

