# Rincian Nilai Persediaan (`InventoryValuationDetailReport`)

Group: Persediaan. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/InventoryValuationDetailReport.json`](captures/InventoryValuationDetailReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedItem":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedItem` | ITEM_INVENTORY_MULTI | [] | Barang & Jasa |


## Layout

View: `report`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026".


First table row (columns): `Kode Barang | :`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
