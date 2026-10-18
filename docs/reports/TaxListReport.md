# Daftar Pajak (`TaxListReport`)

Group: Lain-lain. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/TaxListReport.json`](captures/TaxListReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `NONE`; request param used: `{}`.



## Layout

View: `report`. Header lines: —.


First table row (columns): `Keterangan | Persentase`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
