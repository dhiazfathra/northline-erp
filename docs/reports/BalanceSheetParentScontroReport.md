# Neraca (Induk Skontro) (`BalanceSheetParentScontroReport`)

Group: Keuangan. **Status: verified** (zero diff of the layout over the full sandbox Neraca; NL-T1 values via the ERP).
Fixture: [`fixtures/financial-statements.json`](fixtures/financial-statements.json) (`BalanceSheetParentScontroReport`).
ERP: `apps/api/src/reports/financial-statements.ts` (`skontro` over `balanceSheet(...).map(formatLine)`); test: `apps/api/test/statements.test.ts`.

## Parameters

`ASOF` + the Neraca options: `{"asOfDate":"28/02/2031","selectedCurrency":[{"id":50,"code":"IDR",...}],"showTotal":false,
"showParentAccount":true,"showChildAccount":true,"showZeroBalance":false,"showParentAccountBalance":true}`.

## Layout

Columns `Deskripsi | Nilai (IDR) | Deskripsi | Nilai (IDR)`: the [Neraca (Standar)](BalanceSheetStandardReport.md) rows
with ASET on the left and LIABILITAS DAN EKUITAS on the right, zipped row by row:

```
ASET | LIABILITAS DAN EKUITAS
ASET LANCAR | LIABILITAS
Kas dan Setara Kas | LIABILITAS JANGKA PENDEK
Kas & Bank | -25.335.714 | Utang Usaha
...
Jumlah Kas dan Setara Kas | 2.542.385,5 | NL-T1 Utang Lain | 1.000.000
Jumlah Kewajiban Jangka Pendek Lainnya | 3.872.386      <- left side is a spacer row here
```

## Calculation rules

- Values are exactly the standard Neraca's; only the arrangement differs.
- **Spacer rows decide the pairing.** Accurate prints a blank row after every "Jumlah ..." row unless the next row is
  another "Jumlah ..." row, on each side independently. Rows blank on both sides drop out. The left column ends with
  JUMLAH ASET; the right with JUMLAH LIABILITAS DAN EKUITAS.
- Verified two ways: `skontro()` applied to Accurate's own standard Neraca (demo accounts included, 42 rows) equals the
  Skontro capture exactly; the ERP's NL-T1 and Laba Tahun Ini label-value pairs appear in the ERP's Skontro.
- Capturing this needs blank rows kept: `runReport(app, id, param, { keepEmpty: true })`.
