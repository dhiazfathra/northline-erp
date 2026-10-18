# Giro Mundur (Belum Jatuh Tempo) (`OutstandingChequeReport`)

Group: Kas & Bank. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/OutstandingChequeReport.json`](captures/OutstandingChequeReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOF`; request param used: `{"asOfDate":"18/10/2026","selectedBank":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBank` | BANK_MULTI | [] | Kas/Bank |


## Layout

View: `report`. Header lines: "Per Tgl. 18 Okt 2026".


First table row (columns): `Tgl Transaksi | Tanggal Cek | Tipe Transaksi | No. Cek | Pelanggan/Pemasok | Terima | Bayar`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
