# Laba/Rugi Departemen (Perbandingan Anggaran) (`ProfitLossCompareBudgetDepartmentReport`)

Group: Pusat Laba & Biaya. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/ProfitLossCompareBudgetDepartmentReport.json`](captures/retail/ProfitLossCompareBudgetDepartmentReport.json).

Status: blocked: requires Budget, Department. Fixture: [`fixtures/retail/ProfitLossCompareBudgetDepartmentReport.json`](fixtures/retail/ProfitLossCompareBudgetDepartmentReport.json) (Retail Demo).

## Purpose

Menampilkan laba/rugi per departemen dengan penambahan kolom anggaran dan perbandingannya dan juga persentasenya. Daftar Laporan category: Pusat Laba & Biaya; view type `financialstatement`.

## Params

Date kind `PERIODFROMTO`: `periodStartMonth`, `periodStartYear`, `periodEndMonth`, `periodEndYear`.
- `selectedDepartment`: PER_DEPARTMENT, default []
- Booleans: `showTotal` (default false), `showParentAccount` (default true), `showChildAccount` (default true), `showZeroBalance` (default false), `showParentAccountBalance` (default true)

Params used for the capture (default over all history unless stated): `{"periodStartMonth":"1","periodStartYear":2016,"periodEndMonth":"12","periodEndYear":2016,"selectedDepartment":[{"id":101,"name":"Head Office"}],"showParentAccount":true,"showChildAccount":true,"showZeroBalance":false,"showParentAccountBalance":true,"showTotal":false}`

## Columns

`Deskripsi` | `Aktual (IDR)` | `Anggaran` | `Variance` | `% Var.`

## Row grouping

Title, period line (`Dari Periode Januari 2016 s/d Desember 2016`), block heading `Departemen : Head Office` (one block per selected department), then the same sections as [ProfitLossCompareBudgetReport](ProfitLossCompareBudgetReport.md). Parent accounts print with children below them. Capture selected only Head Office (id 101) for 2016 because the 2026 default period is empty.

Title lines: `Laba/Rugi Departemen (Perbandingan Anggaran)`, `Dari Periode Januari 2016 s/d Desember 2016`, `Departemen : Head Office`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- `Jumlah Pendapatan` 111,280,000 - `Jumlah Beban Pokok Penjualan` 79,819,010.84 = `LABA KOTOR` 31,460,989.16 (checked).
- LABA KOTOR 31,460,989.16 - Jumlah Beban Operasional 75,365,000 = PENDAPATAN OPERASIONAL -43,904,010.84 (checked).
- PENDAPATAN OPERASIONAL -43,904,010.84 + non-operating income 35,996,000 (Bunga Bank 19,105,000 + Bunga Deposito 16,891,000 = 35,996,000, checked) = LABA BERSIH -7,908,010.84 (checked).
- Anggaran is 0 on every row (no budget exists in Retail Demo); Variance = Aktual - 0 = Aktual; `% Var.` prints `100 %` whenever variance is non-zero on a zero budget, including negatives (-26,800,000 prints `100 %`).
- Zero-balance rows hidden (`showZeroBalance=false`).

## Verified / unverified

- Verified: layout, header cells and the sums stated above, against the Retail Demo capture only.
- Unverified: budget values (none exist), variance direction with non-zero budget, multiple departments in one run (blocks assumed repeated), department filter semantics for postings with no department.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).
- Params use `selectedDepartment=[{id:101,name:"Head Office"}]`; empty list is rejected by the by-department siblings.
