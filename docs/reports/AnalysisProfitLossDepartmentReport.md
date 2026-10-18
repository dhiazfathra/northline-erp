# Analisa Laba/Rugi Departemen (`AnalysisProfitLossDepartmentReport`)

Group: Pusat Laba & Biaya. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/AnalysisProfitLossDepartmentReport.json`](captures/retail/AnalysisProfitLossDepartmentReport.json).

Status: blocked: requires Department. Fixture: [`fixtures/retail/AnalysisProfitLossDepartmentReport.json`](fixtures/retail/AnalysisProfitLossDepartmentReport.json) (Retail Demo).

## Purpose

Laporan yang menampilkan analisa laba/rugi departemen. Daftar Laporan category: Pusat Laba & Biaya; view type `crosstab`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`

## Columns

`Nama Departemen` | `Pendapatan` | `BPP` | `Beban` | `Laba/Rugi`

## Row grouping

One row per department (`Accounting`, `Head Office`, `Opersional`), then a row `[Tanpa Departement]` for postings without department (preceded by a blank spacer row), then `Total Nama Departemen`. Branch filter line `Cabang : [Semua Cabang]`.

Title lines: `Analisa Laba/Rugi Departemen`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Laba/Rugi = Pendapatan - BPP - Beban, per row:
- Accounting: 2,899,700,000 - 2,564,051,317.67 - 26,551,500 = 309,097,182.33 vs 309,097,182.33 (checked)
- Head Office: 124,596,000 - 62,988,614.79 - 97,686,666.67 = -36,079,281.46 vs -36,079,281.45 (within 0.01 rounding)
- Opersional: 1,040,477,757.9 - 592,928,115.64 - 570,769,346.67 = -123,219,704.41 vs -123,219,704.41 (checked)
- [Tanpa Departement]: 6,857,394,191.39 - 3,834,977,988.99 - 8,336,056.9 = 3,014,080,145.5 vs 3,014,080,145.5 (checked)
- Net checked on the total row: 10,922,167,949.29 - 7,054,946,037.09 - 703,343,570.23 = 3,163,878,341.97 vs 3,163,878,341.97 (checked).
- Cross-report ([ProfitLossByBranchReport](ProfitLossByBranchReport.md), same all-history range): Pendapatan 10,922,167,949.29 = Jumlah Pendapatan 10,875,821,103.29 + Jumlah Pendapatan Non Operasional 46,346,846 (checked), i.e. non-operating income is inside `Pendapatan`.
- Beban 703,343,570.23 = Jumlah Beban Operasional 991,093,141.68 + net non-operating expense -287,749,571.45 (checked), i.e. non-operating expense (including negative selisih kurs) is inside `Beban`.
- BPP total 7,054,946,037.09 = branch report Jumlah Beban Pokok Penjualan Total (checked).
- Auto-check `Total Nama Departemen` row (4 data rows): Pendapatan: checked 4 rows sum 10,922,167,949.29 vs total 10,922,167,949.29; BPP: checked 4 rows sum 7,054,946,037.09 vs total 7,054,946,037.09; Beban: within 0.01 rounding of 4 rows sum 703,343,570.24 vs total 703,343,570.23; Laba/Rugi: checked 4 rows sum 3,163,878,341.97 vs total 3,163,878,341.97.

## Verified / unverified

- Verified: row arithmetic and cross-report totals against the branch P&L over the same all-history range.
- Unverified: per-department postings (department attribution by journal line not traced); sort order of departments; single-branch filter.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).

