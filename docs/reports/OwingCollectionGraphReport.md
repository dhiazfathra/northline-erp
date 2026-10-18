# Grafik Rata-rata Pembayaran Pelanggan (`OwingCollectionGraphReport`)

Group: Piutang. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/OwingCollectionGraphReport.json`](captures/OwingCollectionGraphReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026"}`.



## Layout

View: `chart`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026".


## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
