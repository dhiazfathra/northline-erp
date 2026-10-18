# Histori Buku Besar (CSV) (`GeneralLedgerHistoryDownloadReport`)

Group: Buku Besar. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/GeneralLedgerHistoryDownloadReport.json`](captures/GeneralLedgerHistoryDownloadReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `download`. No HTML output (download/CSV report or empty with default params).


## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
