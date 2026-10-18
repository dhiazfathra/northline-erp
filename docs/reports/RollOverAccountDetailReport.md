# Rincian Akun Penyelesaian Pesanan  (`RollOverAccountDetailReport`)

Group: Pekerjaan Pesanan. **Status: out of scope** (ADR-0010; spec captured, not verified) (no seeded fixture or ERP implementation yet).
Capture: [`captures/RollOverAccountDetailReport.json`](captures/RollOverAccountDetailReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `report`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026", "Cabang : [Semua Cabang]".


First table row (columns): `Nomor # | : | No Pekerjaan # | :`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
