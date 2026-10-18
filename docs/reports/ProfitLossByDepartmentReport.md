# Laba/Rugi Departemen (`ProfitLossByDepartmentReport`)

Group: Pusat Laba & Biaya. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/ProfitLossByDepartmentReport.json`](captures/retail/ProfitLossByDepartmentReport.json).

Status: verified (Retail Demo, ADR-0022). Fixture: [`fixtures/retail/dimensions-ra.json`](fixtures/retail/dimensions-ra.json); test `apps/api/test/dimensions.test.ts`.

## Purpose

Menampilkan laba rugi per Departemen untuk periode yg dipilih. Daftar Laporan category: Pusat Laba & Biaya; view type `financialstatement`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: PER_BRANCH, default []
- `selectedDepartment`: DEPARTMENT_MULTI, default []
- `selectedProject`: PER_PROJECT_OPTIONAL, default true
- `selectedDataClassification1`: PER_DATA_CLASSIFICATION_1_OPTIONAL, default true
- `selectedDataClassification2`: PER_DATA_CLASSIFICATION_2_OPTIONAL, default true
- `selectedDataClassification3`: PER_DATA_CLASSIFICATION_3_OPTIONAL, default true
- `selectedDataClassification4`: PER_DATA_CLASSIFICATION_4_OPTIONAL, default true
- `selectedDataClassification5`: PER_DATA_CLASSIFICATION_5_OPTIONAL, default true
- `selectedDataClassification6`: PER_DATA_CLASSIFICATION_6_OPTIONAL, default true
- `selectedDataClassification7`: PER_DATA_CLASSIFICATION_7_OPTIONAL, default true
- `selectedDataClassification8`: PER_DATA_CLASSIFICATION_8_OPTIONAL, default true
- `selectedDataClassification9`: PER_DATA_CLASSIFICATION_9_OPTIONAL, default true
- `selectedDataClassification10`: PER_DATA_CLASSIFICATION_10_OPTIONAL, default true
- Booleans: `showTotal` (default false), `showParentAccount` (default true), `showChildAccount` (default true), `showZeroBalance` (default false), `showParentAccountBalance` (default true)

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedDepartment":[],"showTotal":false,"showParentAccount":true,"showChildAccount":true,"showZeroBalance":false,"showParentAccountBalance":true}`

Accepted wire shape (found 2026-10-19 from `init-report-input.do` defaults and the server's own errors): `selectedDepartment` is a list of `{id, name}`; `selectedProject` and `selectedDataClassification1..10` must be lists (`[]`), not the `true` the form defaults to: a boolean fails with `class java.lang.Boolean cannot be cast to class java.util.List`.

## Columns

`Deskripsi` | one column per selected department | `Total`

## Row grouping

Seed (Retail Demo, 2041, all `NL-RA`): departments NL-RA-D1/D2, project NL-RA-P1 (P.00001), Jurnal Umum J1–J7 (JV.2041.02.00001 … JV.2041.09.00001) over branches JAKARTA and SURABAYA, with one line in a project, lines in each department and lines with no department (J5, every cash line). Params of the capture: `{"selectedDataClassification10": [], "endDate": "31/12/2041", "showChildAccount": true, "selectedDataClassification1": [], "selectedDataClassification2": [], "showParentAccountBalance": true, "showTotal": false, "selectedDataClassification5": [], "selectedDataClassification6": [], "selectedDepartment": [{"id": 101850, "name": "NL-RA-D1"}, {"id": 101900, "name": "NL-RA-D2"}], "selectedProject": [], "selectedDataClassification3": [], "selectedDataClassification4": [], "selectedDataClassification9": [], "showZeroBalance": false, "showParentAccount": true, "startDate": "01/01/2041", "selectedDataClassification7": [], "selectedBranch": [{"name": "[Semua Cabang]", "id": null}], "selectedDataClassification8": []}`.

## Calculation rules

- Each amount column is the standard Laba/Rugi ([ProfitLossStandardReport](ProfitLossStandardReport.md)) computed over only the journal lines of that column, with zero rows kept so the columns align; an account row hides only when it is zero in every column (`showZeroBalance=false`). Headings and `Jumlah ...` rows always print.
- Retail Demo ends with two rows `LABA BERSIH (Sebelum Pajak)` and `LABA BERSIH (Setelah Pajak)`, both equal to the net profit (no income-tax line is modelled).
- Numbers print en-US (`1,650,000.5`), negatives with a leading `-`.
- A column takes the lines tagged with that department; lines with no department appear in no column, so Total is the sum over the selected departments only (2041 Total LABA BERSIH 9,799,999.5 vs the all-lines 9,399,999.5 of Laba/Rugi Cabang: J5's 400,000 has no department).

## Verified / unverified

- Verified: zero diff on every body row against the 2041 capture ([`fixtures/retail/dimensions-ra.json`](fixtures/retail/dimensions-ra.json), test `apps/api/test/dimensions.test.ts`); page furniture (title lines, footer, repeated header) is stripped before comparing.
- Unverified: branch filter other than `[Semua Cabang]`, data classification filters, foreign-currency accounts.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

