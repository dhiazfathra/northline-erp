# Laba/Rugi (Perbandingan Anggaran) (`ProfitLossCompareBudgetReport`)

Group: Keuangan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/ProfitLossCompareBudgetReport.json`](captures/retail/ProfitLossCompareBudgetReport.json).

Status: blocked: requires Budget. Fixture: [`fixtures/retail/ProfitLossCompareBudgetReport.json`](fixtures/retail/ProfitLossCompareBudgetReport.json) (Retail Demo).

## Purpose

Menampilkan laba/rugi dengan penambahan kolom anggaran dan perbandingannya dan juga persentasenya. Daftar Laporan category: Keuangan; view type `financialstatement`.

## Params

Date kind `PERIODFROMTO`: `periodStartMonth`, `periodStartYear`, `periodEndMonth`, `periodEndYear`.
- Booleans: `showTotal` (default false), `showParentAccount` (default true), `showChildAccount` (default true), `showZeroBalance` (default false), `showParentAccountBalance` (default true)

Params used for the capture (default over all history unless stated): `{"periodStartMonth":"1","periodStartYear":2026,"periodEndMonth":"12","periodEndYear":2026,"showTotal":false,"showParentAccount":true,"showChildAccount":true,"showZeroBalance":false,"showParentAccountBalance":true}`

## Columns

`Deskripsi` | `Aktual (IDR)` | `Anggaran` | `Variance` | `% Var.`

## Row grouping

Sections in order: `PENDAPATAN` (accounts, then `Jumlah Pendapatan`), `BEBAN POKOK PENJUALAN` (`Jumlah Beban Pokok Penjualan`), `LABA KOTOR`, `BEBAN OPERASIONAL` (`Jumlah Beban Operasional`), `PENDAPATAN OPERASIONAL`, `PENDAPATAN DAN BEBAN NON OPERASIONAL` with sub-sections `Pendapatan Non Operasional` / `Beban Non Operasional` and `Jumlah Pendapatan dan Beban Non Operasional`, then `LABA BERSIH` (twice when no tax: Sebelum Pajak / Setelah Pajak). Capture rows are headings and totals only: the default period Jan-Dec 2026 holds no postings (Retail Demo data is Oct 2016 - Feb 2017), so every amount is 0 and `showZeroBalance=false` hides all accounts.

Title lines: `Laba/Rugi (Perbandingan Anggaran)`, `Dari Periode Januari 2026 s/d Desember 2026`; footer lines `ACCURATE Accounting System Report`, `Tercetak pada <d MMMM yyyy - HH:mm>`, `Halaman <n> dari <total>` on every page.

## Calculation rules

- Same statement structure as [Laba/Rugi (Perbandingan Periode)](ProfitLossComparePeriodReport.md); the second amount column is the budget (`Anggaran`) instead of a second period.
- All values 0 with `% Var.` = `0 %`: 0 variance on 0 budget prints `0 %` (proven by the capture).
- With non-zero actual and zero budget `% Var.` prints `100 %` (proven on the department sibling, see [ProfitLossCompareBudgetDepartmentReport](ProfitLossCompareBudgetDepartmentReport.md): -26,800,000 vs 0 prints `100 %`, not `-100 %`).
- Variance = Aktual - Anggaran is the inferred direction (only budget=0 cases seen); unverified for non-zero budgets.

## Verified / unverified

- Verified: layout, header cells and the sums stated above, against the Retail Demo capture only.
- Unverified: every non-zero value; budgets (Retail Demo has none, all `Anggaran` cells are 0); variance direction with a non-zero budget; this period uses Jan-Dec 2026, which is empty.

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).
- Default period is the calendar year of the capture date (2026), which holds no data in Retail Demo; use 2016 or 2017 to see numbers.
