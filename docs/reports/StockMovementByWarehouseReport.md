# Pergerakan Stok per Barang (`StockMovementByWarehouseReport`)

Group: Gudang . **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/StockMovementByWarehouseReport.json`](captures/StockMovementByWarehouseReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedWarehouse":null}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedWarehouse` | WAREHOUSE | null | Gudang |


## Layout

View: `report`. Accurate returned an error for default params: `{"":["ERROR: invalid input syntax for type bigint: \"null\"\n  Position: 311"]}`.


## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
