# Penjualan Barang per Gudang (`ViewSalesItemByWarehouseReport`)

Group: Penjualan. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/ViewSalesItemByWarehouseReport.json`](captures/ViewSalesItemByWarehouseReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |


## Layout

View: `crosstab`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026", "Cabang : [Semua Cabang]".


First table row (columns): `Nama Barang | Gudang | Kuantitas | Penjualan`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
