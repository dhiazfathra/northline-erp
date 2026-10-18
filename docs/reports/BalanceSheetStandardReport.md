# Neraca (Standar) (`BalanceSheetStandardReport`)

Group: Keuangan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18.
Fixture: [`fixtures/financial-statements.json`](fixtures/financial-statements.json) (`balanceSheet`). The sandbox holds
other balance-sheet data, so the diff covers NL-T1 rows, "Laba Tahun Ini" (2030–31 P&L is fixture-only) and the
change in "Laba Ditahan". ERP: `balanceSheet()` in `apps/api/src/reports/financial-statements.ts`.

## Parameters

`asOfDate` (`dd/MM/yyyy`), `selectedCurrency` (array of currency objects), and the same booleans as Laba/Rugi. No branch.

## Layout (fixed sections by account type)

```
ASET
  ASET LANCAR
    Kas dan Setara Kas (CASH_BANK) … Jumlah Kas dan Setara Kas
    Piutang Usaha (ACCOUNT_RECEIVABLE) … Jumlah Piutang Usaha
    Persediaan (INVENTORY) … Jumlah Persediaan
    Aset Lancar Lainnya (OTHER_CURRENT_ASSET) … Jumlah Aset Lancar Lainnya
    Jumlah Aset Lancar
  ASET TIDAK LANCAR
    Nilai Histori (FIXED_ASSET) … Jumlah Nilai Histori
    Akumulasi Penyusutan (ACCUMULATED_DEPRECIATION) … Jumlah Akumulasi Penyusutan
    Jumlah Aset Tidak Lancar
  Aset Lainnya (OTHER_ASSET) … Jumlah Aset Lainnya
  JUMLAH ASET
LIABILITAS DAN EKUITAS
  LIABILITAS
    LIABILITAS JANGKA PENDEK
      Utang Usaha (ACCOUNT_PAYABLE) … Jumlah Utang
      Kewajiban Jangka Pendek Lainnya (OTHER_CURRENT_LIABILITY) … Jumlah Kewajiban Jangka Pendek Lainnya
      Jumlah Kewajiban Jangka Pendek
    LIABILITAS JANGKA PANJANG … Jumlah Kewajiban Jangka Panjang
    Jumlah Kewajiban
  EKUITAS (EQUITY accounts, then "Laba Tahun Ini") … Jumlah Ekuitas
  JUMLAH LIABILITAS DAN EKUITAS
```

## Rules

1. Balance = net of all lines `≤ asOfDate`, natural side (assets D − C; liabilities/equity C − D); wrong-side balances
   print negative (overdrawn NL-T1 Kas `-1.250.000,5`).
2. **Laba Ditahan** = its own balance + net P&L of fiscal years ended before `asOfDate`'s fiscal year (same roll-forward
   as trial balance rule 5). Fixture: `-34.002.596` at 2030-12-31 → `-31.002.596` at 2031-02-28 (+3.000.000 prior-year income).
3. **Laba Tahun Ini** = net P&L from fiscal-year start to `asOfDate` (C − D). 2030-12-31: `3.000.000`; 2031-02-28: `-250.000,5`.
4. Headings and section totals always print; zero accounts hide; parents print subtree sums, section totals sum leaves only
   (sandbox: "Jumlah Kas dan Setara Kas" 2.542.385,5 excludes the parent row "Kas & Bank").
5. Within a section: account-tree order, siblings by account number string.

Unverified: accumulated-depreciation sign and placement, foreign-currency revaluation (sandbox USD bank shows
1.600.000 here vs 1.550.000 in the trial balance, so the balance sheet revalues at a rate), OTHER_ASSET placement.
