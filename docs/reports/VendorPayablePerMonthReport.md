# Utang per Bulan (`VendorPayablePerMonthReport`)

Group: Utang. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/VendorPayablePerMonthReport.json`](captures/VendorPayablePerMonthReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOFYEAR`; request param used: `{"asOfYear":2026}`.



## Layout

View: `report`. Header lines: "per 2026".


First table row (columns): `Nama Pemasok | Saldo Awal | Januari | Februari | Maret | April | Mei | Juni | Juli | Agustus | September | Oktober | November | Desember | Saldo Akhir`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
