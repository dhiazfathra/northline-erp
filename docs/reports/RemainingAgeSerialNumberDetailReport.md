# Sisa Umur Per Nomor Produksi (`RemainingAgeSerialNumberDetailReport`)

Group: Gudang . **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/RemainingAgeSerialNumberDetailReport.json`](captures/RemainingAgeSerialNumberDetailReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOF`; request param used: `{"asOfDate":"18/10/2026","selectedItem":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedItem` | ITEM_SN_MULTI | [] | Barang & Jasa |


## Layout

View: `report`. Header lines: "Per Tgl. 18 Okt 2026".


First table row (columns): `Kode Barang | :`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
