# Rincian Gaji Karyawan per Tahun (`EmployeePaymentYearlyByEmployeeReport`)

Group: Buku Besar. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/EmployeePaymentYearlyByEmployeeReport.json`](captures/EmployeePaymentYearlyByEmployeeReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOFYEAR`; request param used: `{"asOfYear":2026,"selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `crosstab`. Header lines: "per 2026", "Cabang : [Semua Cabang]".


## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
