# Proyeksi Ketersediaan Kas (`CashAvailabilityChartReport`)

Group: Keuangan. **Status: verified via backing table** (ADR-0011). Fixture: [`fixtures/tax-t19.json`](fixtures/tax-t19.json) (`reports.CashAvailabilityChartReport`), image [`captures/charts/CashAvailabilityChartReport-t23.png`](captures/charts/CashAvailabilityChartReport-t23.png). ERP: `apps/api/src/reports/cash-flow.ts` (`cashAvailabilityEvents`); test: `apps/api/test/tax.test.ts`. Backing table: [Proyeksi Kas per Bulan](CashProjectionReport.md).
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
- The points carry no value labels. Per ADR-0011 the ERP's events (+500.000 on 2026-11-20, -300.000 on 2026-12-05, the
  same open balances Proyeksi Kas per Bulan verifies at zero diff) must sit on the chart's x-axis dates; they do.

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
