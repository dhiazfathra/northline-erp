# Daftar Piutang Karyawan (`EmployeeLoanListReport`)

Group: Kas & Bank. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/EmployeeLoanListReport.json`](captures/EmployeeLoanListReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{"selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `report`. Header lines: "Cabang : [Semua Cabang]".


First table row (columns): `Nomor # | Tanggal | Nama Karyawan | Angsuran Pokok | Angsuran Bunga | Total Angsuran | Suku Bunga | Bunga | Terbayar | Sisa Angsuran`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
