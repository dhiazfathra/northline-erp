# Porsi Gaji Karyawan (`EmployeeSalaryProportionReport`)

Group: Buku Besar. **Status: out of scope** (ADR-0010; spec captured, not verified) (no seeded fixture or ERP implementation yet).
Capture: [`captures/EmployeeSalaryProportionReport.json`](captures/EmployeeSalaryProportionReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOFYEAR`; request param used: `{"asOfYear":2026,"selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `chart`. Header lines: "per 2026", "Cabang : [Semua Cabang]".


## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
