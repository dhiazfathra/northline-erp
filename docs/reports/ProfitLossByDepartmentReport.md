# Laba/Rugi Departemen (`ProfitLossByDepartmentReport`)

Group: Pusat Laba & Biaya. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/ProfitLossByDepartmentReport.json`](captures/retail/ProfitLossByDepartmentReport.json).

Status: blocked: requires Department (spec partial: layout not captured).

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

## Columns

Not captured (see Status). Expected columns: `Deskripsi` plus one amount column per selected department and a `Total` column, by analogy with [ProfitLossByBranchReport](ProfitLossByBranchReport.md).

## Row grouping

Layout was not captured. Server rejected every API param shape tried for `ProfitLossByDepartmentReport`: capture run with `selectedDepartment=[]` returned `Departemen harus diisi` (department required); a drill-down re-run with `selectedDepartment=[{id:101,name:"Head Office"}]` over 01/01/2016-31/12/2017 returned the generic server error `Upsss... Telah terjadi permasalahan` (internal error, 1 run).  Retail Demo has 3 departments (Accounting id 105, Head Office 101, Opersional 103) and zero projects. Expected layout by analogy: [Laba/Rugi Cabang](ProfitLossByBranchReport.md) with department columns instead of branch columns; headline `Departemen : [...]`.

## Calculation rules

- Unverified. Retail Demo cross-check available from [AnalysisProfitLossDepartmentReport](AnalysisProfitLossDepartmentReport.md): per-department Pendapatan/BPP/Beban/Laba-Rugi totals (Accounting 309,097,182.33, Head Office -36,079,281.45, Opersional -123,219,704.41, no department 3,014,080,145.5) are what this report's bottom lines should reproduce.

## Verified / unverified

- Verified: only that the server rejects the API params used.
- Unverified: entire layout; the validation text 'Departemen harus diisi' shows `selectedDepartment` must be a non-empty selection (empty list = rejected), but the accepted wire shape was not found.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

