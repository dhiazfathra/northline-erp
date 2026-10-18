# Barang Grup (`ItemGroupDetailReport`)

Group: Persediaan. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/ItemGroupDetailReport.json`](captures/ItemGroupDetailReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{"selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `report`. Header lines: "Cabang : [Semua Cabang]".


First table row (columns): `Kode Barang Grup Barang | : | Satuan | :`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
