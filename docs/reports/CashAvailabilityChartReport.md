# Proyeksi Ketersediaan Kas (`CashAvailabilityChartReport`)

Group: Keuangan. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/CashAvailabilityChartReport.json`](captures/CashAvailabilityChartReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026"}`.



## Layout

View: `chart`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026".


## Findings (2026-10-18)

- Output is a server-rendered PNG line chart (`report-output-image/...png`); the XLS export only embeds the same PNG,
  so no exact numbers are available. Fetch: `runReport(app, id, param, { view: 'xls' })` (xlsx with `xl/media/*.png`).
- Over 01 Okt 2026 - 31 Mar 2027 the x-axis points are the dates where projected cash changes: 2026-10-01, 10-03, 10-04,
  10-31, **11-20** and **12-05** (the T23 receivable and payable due dates, see [CashProjectionReport](CashProjectionReport.md)),
  11-30. Y = running cash balance (about -25.3 jt at 1 Okt rising to about 7.5-8 jt).
- The points carry no value labels, so a zero-diff check against the ERP is not possible from the image. The underlying
  figures are the ones Proyeksi Kas per Bulan verifies, per event date instead of per month.

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
