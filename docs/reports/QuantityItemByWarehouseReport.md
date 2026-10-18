# Kuantitas Barang per Gudang (`QuantityItemByWarehouseReport`)

Group: Gudang . **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/QuantityItemByWarehouseReport.json`](captures/QuantityItemByWarehouseReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOF`; request param used: `{"asOfDate":"18/10/2026","selectedBranch":[{"name":"[Semua Cabang]","id":null}],"selectedWarehouse":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |
| `selectedWarehouse` | WAREHOUSE_MULTI | [] | Gudang |

Selection: `ITEM_CATEGORY_ALL`.

## Layout

View: `crosstab`. Header lines: "Per Tgl. 18 Okt 2026", "Cabang : [Semua Cabang]".


## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
