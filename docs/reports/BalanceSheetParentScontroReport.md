# Neraca (Induk Skontro) (`BalanceSheetParentScontroReport`)

Group: Keuangan. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/BalanceSheetParentScontroReport.json`](captures/BalanceSheetParentScontroReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOF`; request param used: `{"asOfDate":"18/10/2026","selectedCurrency":[{"id":50,"code":"IDR","name":"Indonesian Rupiah","symbol":"Rp"}],"showTotal":false,"showParentAccount":true,"showChildAccount":true,"showZeroBalance":false,"showParentAccountBalance":true}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedCurrency` | IN_CURRENCY | [] | Mata Uang |
| `showTotal` | BOOLEAN | false | Hanya Tampilkan Total |
| `showParentAccount` | BOOLEAN | true | Tampilkan Akun Induk |
| `showChildAccount` | BOOLEAN | true | Tampilkan Akun Anak |
| `showZeroBalance` | BOOLEAN | false | Tampilkan data dengan Saldo Nol |
| `showParentAccountBalance` | BOOLEAN | true | Tampilkan Saldo Akun Induk |


## Layout

View: `financialstatement`. Header lines: "Per Tgl. 18 Okt 2026", "Mata Uang : Indonesian Rupiah".


First table row (columns): `Deskripsi | Nilai (IDR) | Deskripsi | Nilai (IDR)`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
