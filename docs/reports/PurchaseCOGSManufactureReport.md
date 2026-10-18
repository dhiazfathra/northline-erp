# Pembelian (Harga Pokok Produksi) (`PurchaseCOGSManufactureReport`)

Group: Manufaktur. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/PurchaseCOGSManufactureReport.json`](captures/PurchaseCOGSManufactureReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `PERIOD`; request param used: `{"periodMonth":"10","periodYear":2026}`.



## Layout

View: `report`. Header lines: "Per Oktober 2026".


First table row (columns): `Tipe Transaksi | Nomor # | Nama Barang | Nilai Masuk | Nilai Keluar | Nilai`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
