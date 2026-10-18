# Rincian Umur Persediaan (`InventoryAgingDetailReport`)

Group: Persediaan. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/InventoryAgingDetailReport.json`](captures/InventoryAgingDetailReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOF`; request param used: `{"asOfDate":"18/10/2026","selectedItem":[],"selectedWarehouse":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedItem` | ITEM_INVENTORY_MULTI | [] | Barang & Jasa |
| `selectedWarehouse` | WAREHOUSE_MULTI_WITH_ALL_WAREHOUSE | [] | Gudang |


## Layout

View: `report`. Header lines: "Per Tgl. 18 Okt 2026".


First table row (columns): `Kode Barang | : | Satuan | :`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
