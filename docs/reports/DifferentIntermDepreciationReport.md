# Perbedaan Penyusutan (`DifferentIntermDepreciationReport`)

Group: Aset Tetap. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/DifferentIntermDepreciationReport.json`](captures/DifferentIntermDepreciationReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOFYEAR`; request param used: `{"asOfYear":2026,"selectedAsset":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedAsset` | FIXED_ASSET_MULTI | [] | Aset Tetap |


## Layout

View: `report`. Header lines: "per 2026".


First table row (columns): `Kode Aset | : | Perkiraan Umur | : | Tahun`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
