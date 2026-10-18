# Daftar Hak Akses per Pengguna (`AccessPrivilegeByUserListReport`)

Group: Lain-lain. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/AccessPrivilegeByUserListReport.json`](captures/AccessPrivilegeByUserListReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{"selectedUser":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedUser` | USER | [] | Pengguna |


## Layout

View: `report`. Header lines: —.


First table row (columns): `Nama | : | Pengguna | :`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
