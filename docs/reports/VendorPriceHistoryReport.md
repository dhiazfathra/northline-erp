# Perubahan Harga Beli Per Barang (`VendorPriceHistoryReport`)

Group: Pembelian. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/VendorPriceHistoryReport.json`](captures/VendorPriceHistoryReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOF`; request param used: `{"asOfDate":"18/10/2026","selectedItem":[]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedItem` | ITEM_INVENTORY_MULTI | [] | Barang & Jasa |


## Layout

View: `report`. Header lines: "Per Tgl. 18 Okt 2026".


First table row (columns): `Mulai Berlaku | Tanggal Berakhir | Pemasok | Mata Uang | Harga Lama | Harga Baru | Satuan`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
