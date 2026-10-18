# Laba/Rugi Departemen (Multi Periode) (`ProfitLossDepartmentMultiPeriodReport`)

Group: Pusat Laba & Biaya. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/ProfitLossDepartmentMultiPeriodReport.json`](captures/retail/ProfitLossDepartmentMultiPeriodReport.json).

Status: verified (Retail Demo, ADR-0022). Fixture: [`fixtures/retail/dimensions-ra.json`](fixtures/retail/dimensions-ra.json); test `apps/api/test/dimensions.test.ts`.

## Purpose

Menampilkan laba rugi departemen bulanan pada rentang periode terpilih. Daftar Laporan category: Pusat Laba & Biaya; view type `financialstatement`.

## Params

Date kind `PERIODFROMTO`: `periodStartMonth`, `periodStartYear`, `periodEndMonth`, `periodEndYear`.
- `selectedBranch`: PER_BRANCH, default []
- `selectedDepartment`: PER_DEPARTMENT, default []
- `selectedProject`: PER_PROJECT_OPTIONAL, default true
- `selectedCurrency`: IN_CURRENCY, default []
- Booleans: `showTotal` (default false), `showParentAccount` (default true), `showChildAccount` (default true), `showZeroBalance` (default false), `showParentAccountBalance` (default true)

Params used for the capture (default over all history unless stated): `{"periodStartMonth":"1","periodStartYear":2026,"periodEndMonth":"12","periodEndYear":2026,"showTotal":false,"showParentAccount":true,"showChildAccount":true,"showZeroBalance":false,"showParentAccountBalance":true}`

Accepted wire shape (found 2026-10-19 from `init-report-input.do` defaults and the server's own errors): `selectedDepartment` must be a one-element list `[{id, name}]` and `selectedProject` a list (`[]`); a bare object returns the generic `Upsss...` server error, a boolean `selectedProject` the Boolean→List cast error. `selectedCurrency` is the IDR currency object from `init-report-input.do`.

## Columns

`Deskripsi` | one column per month, full Indonesian month name (`Januari` … `Desember`) | `Total`

## Row grouping

Seed (Retail Demo, 2041, all `NL-RA`): departments NL-RA-D1/D2, project NL-RA-P1 (P.00001), Jurnal Umum J1–J7 (JV.2041.02.00001 … JV.2041.09.00001) over branches JAKARTA and SURABAYA, with one line in a project, lines in each department and lines with no department (J5, every cash line). Params of the capture: `{"periodStartYear": 2041, "periodEndMonth": 12, "showChildAccount": true, "periodStartMonth": 1, "showParentAccountBalance": true, "showTotal": false, "periodEndYear": 2041, "selectedDepartment": [{"id": 101850, "name": "NL-RA-D1"}], "selectedProject": [], "showZeroBalance": false, "showParentAccount": true, "selectedBranch": [{"name": "[Semua Cabang]", "id": null}]}`.

## Calculation rules

- Each amount column is the standard Laba/Rugi ([ProfitLossStandardReport](ProfitLossStandardReport.md)) computed over only the journal lines of that column, with zero rows kept so the columns align; an account row hides only when it is zero in every column (`showZeroBalance=false`). Headings and `Jumlah ...` rows always print.
- Retail Demo ends with two rows `LABA BERSIH (Sebelum Pajak)` and `LABA BERSIH (Setelah Pajak)`, both equal to the net profit (no income-tax line is modelled).
- Numbers print en-US (`1,650,000.5`), negatives with a leading `-`.
- One department; title line `Laba/Rugi <department> (Multi Periode)`, period line `Dari Periode Januari 2041 s/d Desember 2041`.
- Month columns are calendar months of the period range; Total = sum of the months.

## Verified / unverified

- Verified: zero diff on every body row against the 2041 capture ([`fixtures/retail/dimensions-ra.json`](fixtures/retail/dimensions-ra.json), test `apps/api/test/dimensions.test.ts`); page furniture (title lines, footer, repeated header) is stripped before comparing.
- Unverified: branch filter other than `[Semua Cabang]`, data classification filters, foreign-currency accounts.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

