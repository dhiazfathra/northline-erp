# Aset Tetap per Kategori (`FixedAssetByCategoryReport`)

Group: Aset Tetap. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/FixedAssetByCategoryReport.json`](captures/FixedAssetByCategoryReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOF`; request param used: `{"asOfDate":"18/10/2026"}`.



## Layout

View: `report`. Header lines: "Per Tgl. 18 Okt 2026".


First table row (columns): `Nomor # | Nama Aset | Total Aset | Penyusutan | Penyusutan Tahun ini | Nilai Buku | Tanggal Pakai | Tanggal Beli`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
