# Gaji Karyawan per Tahun (`EmployeeSalaryPerYearReport`)

Group: Buku Besar. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/EmployeeSalaryPerYearReport.json`](captures/EmployeeSalaryPerYearReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{"selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `chart`. Header lines: "Cabang : [Semua Cabang]".


## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
