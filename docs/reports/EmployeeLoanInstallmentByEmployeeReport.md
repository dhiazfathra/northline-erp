# Angsuran Pinjaman per Karyawan (`EmployeeLoanInstallmentByEmployeeReport`)

Group: Kas & Bank. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/EmployeeLoanInstallmentByEmployeeReport.json`](captures/EmployeeLoanInstallmentByEmployeeReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{"selectedEmployeeLoan":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedEmployeeLoan` | EMPLOYEE_LOAN | [] | No Pinjaman |


## Layout

View: `report`. Header lines: —.


First table row (columns): `Tanggal | Angsuran Pokok | Angsuran Bunga | Total Angsuran | Pembayaran Pokok | Pembayaran Bunga | Total Pembayaran | Sisa Pokok Pinjaman | Nomor Pembayaran`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
