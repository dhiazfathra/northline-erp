# Grafik Pengembalian pada Modal (`ReturnOnEquityChartReport`)

Group: Keuangan. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/ReturnOnEquityChartReport.json`](captures/ReturnOnEquityChartReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `PERIODFROMTO`; request param used: `{"periodStartMonth":"1","periodStartYear":2026,"periodEndMonth":"10","periodEndYear":2026}`.



## Layout

View: `chart`. Header lines: "Dari Periode Januari 2026 s/d Oktober 2026".


## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
