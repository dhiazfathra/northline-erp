# Daftar Kategori Aset Tetap Pajak (`FiscalFaTypeListReport`)

Group: Aset Tetap. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/FiscalFaTypeListReport.json`](captures/FiscalFaTypeListReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{}`.



## Layout

View: `report`. Header lines: —.


First table row (columns): `Nama | Tarif Penyusutan (%) | Perkiraan Umur (tahun) | Metode Penyusutan`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
