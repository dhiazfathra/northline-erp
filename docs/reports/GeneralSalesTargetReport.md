# Target Penjualan per Bulan (`GeneralSalesTargetReport`)

Group: Penjualan. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/GeneralSalesTargetReport.json`](captures/GeneralSalesTargetReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOFYEAR`; request param used: `{"asOfYear":2026,"selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `report`. Header lines: "per 2026", "Cabang : [Semua Cabang]".


First table row (columns): `Nama Target | : | Penganalisa | :`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
