# Laba/Rugi Departemen (Multi Periode) (`ProfitLossDepartmentMultiPeriodReport`)

Group: Pusat Laba & Biaya. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/ProfitLossDepartmentMultiPeriodReport.json`](captures/retail/ProfitLossDepartmentMultiPeriodReport.json).

Status: blocked: requires Department (spec partial: layout not captured).

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

## Columns

Not captured (see Status). Expected columns: `Deskripsi` plus one amount column per month in the period range, by analogy with a multi-period Laba/Rugi (see [ProfitLossComparePeriodReport](ProfitLossComparePeriodReport.md)).

## Row grouping

Layout was not captured. Server rejected every API param shape tried for `ProfitLossDepartmentMultiPeriodReport`: capture run (no department param) and a drill-down re-run with `selectedDepartment=[{id:101,name:"Head Office"}]`, Jan-Dec 2016, both returned the generic server error `Upsss... Telah terjadi permasalahan` (internal error).  Retail Demo has 3 departments (Accounting id 105, Head Office 101, Opersional 103) and zero projects. Expected layout by analogy: [Laba/Rugi (Perbandingan Periode)](ProfitLossComparePeriodReport.md) with one block per selected department and one column per month between `periodStartMonth/Year` and `periodEndMonth/Year`.

## Calculation rules

- Unverified (no data captured).

## Verified / unverified

- Verified: only that the server rejects the API params used.
- Unverified: entire layout.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

