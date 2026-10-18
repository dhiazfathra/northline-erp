# History Peminjaman per Karyawan (`EmployeeLoanHistoryReport`)

Group: Kas & Bank. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/EmployeeLoanHistoryReport.json`](captures/EmployeeLoanHistoryReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{"selectedEmployeeLoan":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedEmployeeLoan` | EMPLOYEE_LOAN | [] | No Pinjaman |


## Layout

View: `report`. Header lines: —.


First table row (columns): `Nomor # | Tanggal | Keterangan | Nilai`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
