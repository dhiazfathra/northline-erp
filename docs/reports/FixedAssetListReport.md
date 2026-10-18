# Daftar Aset Tetap (`FixedAssetListReport`)

Group: Aset Tetap. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/FixedAssetListReport.json`](captures/FixedAssetListReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{}`.



## Layout

View: `report`. Header lines: —.


First table row (columns): `Nomor # | Nama Aset | Total Aset | Penyusutan | Nilai Buku | Tanggal Pakai | Tanggal Beli`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
