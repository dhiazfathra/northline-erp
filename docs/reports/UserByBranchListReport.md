# Daftar Pengguna per Cabang (`UserByBranchListReport`)

Group: Lain-lain. **Status: out of scope** (ADR-0010; spec captured, not verified) (no seeded fixture or ERP implementation yet).
Capture: [`captures/UserByBranchListReport.json`](captures/UserByBranchListReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{}`.



## Layout

View: `report`. Header lines: —.


First table row (columns): `Pengguna | Email | No Handphone`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
