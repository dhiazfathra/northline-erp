# Umur Persediaan (`InventoryAgingReport`)

Group: Persediaan. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/InventoryAgingReport.json`](captures/InventoryAgingReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOF`; request param used: `{"asOfDate":"18/10/2026","selectedWarehouse":[],"selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedWarehouse` | WAREHOUSE_MULTI_WITH_ALL_WAREHOUSE | [] | Gudang |
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |

Selection: `ITEM_CATEGORY_ALL`.

## Layout

View: `crosstab`. Header lines: "Per Tgl. 18 Okt 2026", "Cabang : [Semua Cabang]".


First table row (columns): `Nama Barang | Stok | 1 - 30 | 31 - 60 | 61 - 90 | 91 - 120 | &gt; 120`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
