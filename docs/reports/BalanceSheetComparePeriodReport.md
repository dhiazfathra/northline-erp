# Neraca (Perbandingan Periode) (`BalanceSheetComparePeriodReport`)

Group: Keuangan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/financial-statements.json`](fixtures/financial-statements.json). ERP: `apps/api/src/reports/financial-statements.ts`; test: `apps/api/test/statements.test.ts`.

Params: `startDate` (base date), `endDate` (compare date), currency/booleans. Header "Tanggal 31 Des 2030 dan 28 Feb 2031".

Columns: `Deskripsi` | `Per 31 Dec 2030` | `Per 28 Feb 2031` | `Variance` | `% Var.`

1. Each value column is Neraca (Standar) at that date. **The column headers use English month abbreviations** ("Dec"),
   while the title line uses Indonesian ("Des").
2. Variance = compare − base; `% Var.` = Variance ÷ |base| × 100 rounded to 2 decimals, id-ID decimal comma, trailing zeros
   trimmed (`-109,62 %`, `8,82 %`, `0,31 %`, `100 %`); base 0 → `100 %` (or `0 %` when variance is 0).
   The same rule applies to [Laba/Rugi (Perbandingan Periode)](ProfitLossComparePeriodReport.md).
