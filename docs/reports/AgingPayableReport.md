# Umur Utang (`AgingPayableReport`)

Group: Utang. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/AgingPayableReport.json`](captures/AgingPayableReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOF`; request param used: `{"asOfDate":"18/10/2026","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `crosstab`. Header lines: "Per Tgl. 18 Okt 2026", "Cabang : [Semua Cabang]".


First table row (columns): `Pemasok | Utang | Blm Tempo | 1 - 30 | 31 - 60 | 61 - 90 | 91 - 120 | &gt; 120`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
