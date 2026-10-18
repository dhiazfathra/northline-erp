# Mutasi per Gudang (`WarehouseMutationByItemReport`)

Group: Gudang . **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/WarehouseMutationByItemReport.json`](captures/WarehouseMutationByItemReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedWarehouse":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedWarehouse` | WAREHOUSE_MULTI_WITH_ALL_WAREHOUSE | [] | Gudang |


## Layout

View: `report`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026".


First table row (columns): `Gudang | : | Alamat | :`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
