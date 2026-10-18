# Daftar Bukti Potong PPh Pembelian (`PurchasePaymentPPhReport`)

Group: Pajak. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/PurchasePaymentPPhReport.json`](captures/PurchasePaymentPPhReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026"}`.



## Layout

View: `report`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026".


First table row (columns): `Tanggal | No. Bukti Potong | No Faktur # Faktur Pembelian | Total Kena Pajak | Tarif PPh | Nilai PPh`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
