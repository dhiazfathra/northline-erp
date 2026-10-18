# Daftar Barang dan Jasa (`ItemListReport`)

Group: Persediaan. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/ItemListReport.json`](captures/ItemListReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOF`; request param used: `{"asOfDate":"18/10/2026","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |

Selection: `ITEM_CATEGORY_ALL`.

## Layout

View: `report`. Header lines: "Per Tgl. 18 Okt 2026", "Cabang : [Semua Cabang]".


First table row (columns): `Kode Barang | Nama Barang | Jenis Barang | Def. Hrg. Jual Satuan #1 | Kts (Semua Gdng)`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
