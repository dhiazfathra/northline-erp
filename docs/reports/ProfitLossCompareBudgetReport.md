# Laba/Rugi (Perbandingan Anggaran) (`ProfitLossCompareBudgetReport`)

Group: Keuangan. Reverse-engineered from Accurate Online, **Retail Demo** sandbox, 2026-10-19. Capture: [`captures/retail/ProfitLossCompareBudgetReport.json`](captures/retail/ProfitLossCompareBudgetReport.json).

Status: verified (Retail Demo, ADR-0025). Fixture: [`fixtures/retail/budget-rb.json`](fixtures/retail/budget-rb.json); test `apps/api/test/budget.test.ts`. Default-params fixture: [`fixtures/retail/ProfitLossCompareBudgetReport.json`](fixtures/retail/ProfitLossCompareBudgetReport.json).

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
- Variance = Aktual - Anggaran verified with non-zero budgets (NL-RB section).

## Verified / unverified

- Verified: layout, header cells and the sums stated above, against the Retail Demo capture only.
- Unverified (superseded by the NL-RB section below for budgets and variance): only what that section does not cover, e.g. multiple branches and Per Proyek budgets.

## Budget verification (NL-RB, 2042)

Seed (Retail Demo, all `NL-RB`): departments NL-RB-D1/D2, Jurnal Umum JV.2042.01-05.00001 (lines with and without a department, one amount with cents), Anggaran (module `accurate__budget-target__accountbudget-target`, saved via `/accurate/budget-target/save-accountbudget-target.do`; one document per month and scope `Umum`/`Per Departemen`): Umum Jan, Feb, Jun (with cents) and Per Departemen NL-RB-D1 Jan. Params: `PERIODFROMTO` months of 2042; `selectedBranch=[{name:'[Semua Cabang]',id:null}]`, `selectedProject` and `selectedDataClassification1..10` = `[]` were not needed.

Rules (verified, zero diff in `apps/api/test/budget.test.ts`):
- Variance = Aktual - Anggaran. `% Var.` = Variance / |Anggaran| x 100, 2 decimals, comma decimal (`-4,35 %`); Anggaran 0 prints `100 %` (any sign) or `0 %` when Variance is 0; a negative that rounds to 0 prints `-0 %` (-0.25 on 10,000,000.25).
- Anggaran of a row = budget amounts of the months in the period, natural side, rolled up into parents like actuals; a row prints when Aktual or Anggaran is non-zero (`showZeroBalance=false`).
- Totals (LABA KOTOR, PENDAPATAN OPERASIONAL, non-operating, LABA BERSIH) are computed on each column, then compared.
- Aktual = every journal line (with or without a department); Anggaran = **Umum budgets only** (the NL-RB-D1 budget is not counted).

## Retail Demo variation

- Numbers use en-US formatting (`1,234.5`, decimals only when needed, up to 2) whereas Manufaktur Demo used id-ID (`1.234,5`).
- Dates print as `dd MMM yyyy` with Indonesian month abbreviations (`Des`, `Okt`); footer print timestamp uses an English month (`19 October 2026`).
- The capture omits empty cells, so a row can be shorter than its header (for example a blank `No. PO`).
- Default period is the calendar year of the capture date (2026), which holds no data in Retail Demo; use 2016 or 2017 to see numbers.
