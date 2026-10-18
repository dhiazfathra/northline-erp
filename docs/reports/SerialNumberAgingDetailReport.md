# Umur Nomor Seri/Batch (`SerialNumberAgingDetailReport`)

Group: Persediaan. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/SerialNumberAgingDetailReport.json`](captures/SerialNumberAgingDetailReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOF`; request param used: `{"asOfDate":"18/10/2026","selectedItem":[],"selectedWarehouse":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedItem` | ITEM_SN_MULTI | [] | Barang & Jasa |
| `selectedWarehouse` | WAREHOUSE_MULTI_WITH_ALL_WAREHOUSE | [] | Gudang |


## Layout

View: `report`. Header lines: "Per Tgl. 18 Okt 2026".


First table row (columns): `No Seri/Produksi No Seri | Tgl Transaksi Rincian Stok | 1 - 30 | 31 - 60 | 61 - 90 | 91 - 120 | &gt; 120`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
