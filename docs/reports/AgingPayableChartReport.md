# Grafik Umur Utang (`AgingPayableChartReport`)

Group: Utang. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/AgingPayableChartReport.json`](captures/AgingPayableChartReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOF`; request param used: `{"asOfDate":"18/10/2026","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `chart`. Header lines: "Per Tgl. 18 Okt 2026", "Cabang : [Semua Cabang]".


## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
