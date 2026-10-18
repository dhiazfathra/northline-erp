# Monitoring HPP (`CogsMonitoringReport`)

Group: Penjualan. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/CogsMonitoringReport.json`](captures/CogsMonitoringReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{"selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | PER_BRANCH | [] | Cabang |

Selection: `ITEM_CATEGORY_ALL`.

## Layout

View: `report`. Header lines: "Cabang : [Semua Cabang]".


First table row (columns): `Nama Barang | Harga Jual | Satuan Jual | Harga Beli | Satuan Beli | HPP (%)`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
