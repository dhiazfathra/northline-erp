# Laba/Rugi Cabang (`ProfitLossByBranchReport`)

Group: Keuangan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/ProfitLossByBranchReport.json`](captures/retail/ProfitLossByBranchReport.json).

Status: blocked: requires Branch dimension on Journal. Fixture: [`fixtures/retail/ProfitLossByBranchReport.json`](fixtures/retail/ProfitLossByBranchReport.json) (Retail Demo).

## Purpose

Menampilkan laba rugi dari cabang-cabang untuk periode yg dipilih. Daftar Laporan category: Keuangan; view type `financialstatement`.

## Params

Date kind `FROMTO`: `startDate`, `endDate` (dd/MM/yyyy).
- `selectedBranch`: BRANCH_MULTI_WITH_ALL_BRANCH, default []
- Booleans: `showTotal` (default false), `showParentAccount` (default true), `showChildAccount` (default true), `showZeroBalance` (default false), `showParentAccountBalance` (default true)

Params used for the capture (default over all history unless stated): `{"startDate":"01/01/2000","endDate":"31/12/2040","selectedBranch":[{"name":"[Semua Cabang]","id":null}],"showTotal":false,"showParentAccount":true,"showChildAccount":true,"showZeroBalance":false,"showParentAccountBalance":true}`

## Columns

`Deskripsi` | `JAKARTA` | `SURABAYA` | `Total`

## Row grouping

Same sections as the single-column Laba/Rugi (`PENDAPATAN` ... `LABA BERSIH`), one amount column per branch plus a final `Total` column. Header: `Deskripsi | JAKARTA | SURABAYA | Total`. Parent accounts (e.g. `Penjualan`) are followed by their children, `showParentAccountBalance=true` makes the parent row include its children. Retail Demo has branches JAKARTA and SURABAYA; `selectedBranch=[]` (all) produces both. `LABA BERSIH` is printed twice (before and after tax; no tax account is used).

Title lines: `Laba/Rugi Cabang`, `Dari 01 Jan 2000 s/d 31 Des 2040`, `Cabang : [Semua Cabang]`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Total = JAKARTA + SURABAYA on every row: checked: 55 of 55 numeric 4-cell rows satisfy Total = JAKARTA + SURABAYA exactly.
- Parent includes children: `Penjualan` 10,904,843,757.9 = Handphone 10,680,403,757.9 + Assesoris 221,190,000 + Pendapatan Jasa 3,250,000 (checked).
- `Jumlah Pendapatan` 10,875,821,103.29 = Penjualan + Retur Penjualan 10,904,843,757.9 + (-29,022,654.61) = 10,875,821,103.29 (checked).
- `LABA KOTOR` Total 3,820,875,066.2 = Jumlah Pendapatan 10,875,821,103.29 - Jumlah Beban Pokok Penjualan 7,054,946,037.09 (checked).
- `LABA BERSIH (Sebelum Pajak)` Total 3,163,878,341.97 = LABA KOTOR 3,820,875,066.2 - Jumlah Beban Operasional 991,093,141.68 + Jumlah Pendapatan dan Beban Non Operasional 334,096,417.45 (checked); per column: JAKARTA 3,370,913,801.44 + SURABAYA -207,035,459.47 = 3,163,878,341.97 (checked).
- Cross-report: `LABA BERSIH` Total 3,163,878,341.97 equals `Total Nama Departemen` Laba/Rugi in [AnalysisProfitLossDepartmentReport](AnalysisProfitLossDepartmentReport.md) (checked) and the Jumlah Beban Pokok Penjualan Total 7,054,946,037.09 equals its BPP total (checked).
- Foreign-currency accounts (rows tagged `SGD`/`USD` in the non-operating expense block, selisih kurs) are reported in IDR; the rows exist for both branches.

## Verified / unverified

- Verified: layout, header cells and the sums stated above, against the Retail Demo capture only.
- Unverified: per-branch split of postings beyond Jakarta/Surabaya totals; selecting a single branch; showTotal=true; row ordering rules; the capture lost some account labels in rows after page breaks (cells dropped), so account names for those rows are not recorded.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).
- Capture spans 3 pages (`Halaman n dari 3`); the column header row repeats on every page.
