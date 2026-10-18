# Laba/Rugi Departemen (Perbandingan Periode) (`ProfitLossComparePeriodPerDepartmentReport`)

Group: Pusat Laba & Biaya. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/ProfitLossComparePeriodPerDepartmentReport.json`](captures/retail/ProfitLossComparePeriodPerDepartmentReport.json).

Status: blocked: requires Department (spec partial: layout not captured).

## Purpose

Menampilkan laba rugi per Departemen dibandingkan dengan periode lalu dari selisihnya ditampilkan dengan persentase. Daftar Laporan category: Pusat Laba & Biaya; view type `financialstatement`.

## Params

Date kind `COMPAREFROMTO`: `startDate`, `endDate` (base), `startDateCompare`, `endDateCompare` (dd/MM/yyyy).
- `selectedBranch`: PER_BRANCH, default []
- `selectedDepartment`: PER_DEPARTMENT, default []
- `selectedCurrency`: IN_CURRENCY, default []
- Booleans: `showTotal` (default false), `showParentAccount` (default true), `showChildAccount` (default true), `showZeroBalance` (default false), `showParentAccountBalance` (default true)

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2025","endDate":"31/12/2025","compareStartDate":"01/01/2026","compareEndDate":"31/12/2026","showTotal":false,"showParentAccount":true,"showChildAccount":true,"showZeroBalance":false,"showParentAccountBalance":true}`

## Columns

Not captured (see Status). Expected columns: `Deskripsi` | base period label | compare period label | `Variance` | `% Var.` per department block, by analogy with [ProfitLossComparePeriodReport](ProfitLossComparePeriodReport.md).

## Row grouping

Layout was not captured. Server rejected every API param shape tried for `ProfitLossComparePeriodPerDepartmentReport`: capture run used keys `compareStartDate`/`compareEndDate` (not the Daftar Laporan keys `startDateCompare`/`endDateCompare`) and returned `Cannot parsing part from a null date`, so the capture failure is probably a param-key mistake; a drill-down re-run with the correct keys plus `selectedDepartment=[{id:101,name:"Head Office"}]` (2016 vs 2017) returned the generic server error `Upsss... Telah terjadi permasalahan` (1 run).  Retail Demo has 3 departments (Accounting id 105, Head Office 101, Opersional 103) and zero projects. Expected layout by analogy: [Laba/Rugi (Perbandingan Periode)](ProfitLossComparePeriodReport.md): columns `Deskripsi`, base label, compare label, `Variance` (compare - base), `% Var.` (variance / |base| x 100), repeated per department. The `% Var.` zero-base rule is `100 %` when variance is non-zero, `0 %` otherwise (the budget siblings in Retail Demo show the same `100 %` for zero base).

## Calculation rules

- Unverified (no data captured).

## Verified / unverified

- Verified: only that the server rejects the API params used.
- Unverified: entire layout.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

