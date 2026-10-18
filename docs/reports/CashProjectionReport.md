# Proyeksi Kas per Bulan (`CashProjectionReport`)

Group: Keuangan. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/CashProjectionReport.json`](captures/CashProjectionReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{}`.



## Layout

View: `report`. Header lines: —.


First table row (columns): `Keterangan | 18-31 Oktober 2026 | November 2026 | Desember 2026 | Januari 2027 | Februari 2027`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
