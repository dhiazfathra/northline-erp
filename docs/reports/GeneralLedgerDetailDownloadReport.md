# Rincian Buku Besar (CSV) (`GeneralLedgerDetailDownloadReport`)

Group: Buku Besar. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/GeneralLedgerDetailDownloadReport.json`](captures/GeneralLedgerDetailDownloadReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026","showOnlyHasTransaction":true}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `showOnlyHasTransaction` | BOOLEAN | true | Tampilkan hanya data yang mempunyai Transaksi |


## Layout

View: `download`. No HTML output (download/CSV report or empty with default params).


## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
