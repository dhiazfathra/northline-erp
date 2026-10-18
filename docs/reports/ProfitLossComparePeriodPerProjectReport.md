# Laba/Rugi Proyek (Perbandingan Periode) (`ProfitLossComparePeriodPerProjectReport`)

Group: Pusat Laba & Biaya. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/ProfitLossComparePeriodPerProjectReport.json`](captures/retail/ProfitLossComparePeriodPerProjectReport.json).

Status: blocked: requires Project dimension (spec partial: layout not captured).

## Purpose

Menampilkan laba rugi per Proyek dibandingkan dengan periode lalu dari selisihnya ditampilkan dengan persentase. Daftar Laporan category: Pusat Laba & Biaya; view type `financialstatement`.

## Params

Date kind `COMPAREFROMTO`: `startDate`, `endDate` (base), `startDateCompare`, `endDateCompare` (dd/MM/yyyy).
- `selectedBranch`: PER_BRANCH, default []
- `selectedProject`: PER_PROJECT, default []
- `selectedCurrency`: IN_CURRENCY, default []
- Booleans: `showTotal` (default false), `showParentAccount` (default true), `showChildAccount` (default true), `showZeroBalance` (default false), `showParentAccountBalance` (default true)

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2025","endDate":"31/12/2025","compareStartDate":"01/01/2026","compareEndDate":"31/12/2026","showTotal":false,"showParentAccount":true,"showChildAccount":true,"showZeroBalance":false,"showParentAccountBalance":true}`

## Columns

Not captured (see Status). Expected columns: same as the per-department compare report with project blocks.

## Row grouping

Layout was not captured. Server rejected every API param shape tried for `ProfitLossComparePeriodPerProjectReport`: capture run used keys `compareStartDate`/`compareEndDate` instead of `startDateCompare`/`endDateCompare` and returned `Cannot parsing part from a null date`; not re-run with correct keys (Retail Demo has zero projects, so no data could appear anyway).  Retail Demo has 3 departments (Accounting id 105, Head Office 101, Opersional 103) and zero projects. Expected layout by analogy: [Laba/Rugi (Perbandingan Periode)](ProfitLossComparePeriodReport.md) repeated per project. Retail Demo has zero projects, so even a successful run would print only title lines.

## Calculation rules

- Unverified (no data captured).

## Verified / unverified

- Verified: only that the server rejects the API params used.
- Unverified: entire layout; whether the sandbox can ever produce rows (no projects exist).

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

