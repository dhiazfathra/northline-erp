# Histori Lokasi Aset (`AssetLocationHistoryReport`)

Group: Aset Tetap. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/AssetLocationHistoryReport.json`](captures/AssetLocationHistoryReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{"selectedAsset":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedAsset` | FIXED_ASSET_MULTI | [] | Aset Tetap |


## Layout

View: `report`. Header lines: —.


First table row (columns): `Nomor # | : | Umur (Tahun) | :`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
