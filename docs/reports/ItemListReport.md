# Daftar Barang dan Jasa (`ItemListReport`)

Group: Persediaan. **Status: verified** (zero diff on the NL block). Fixture: [`fixtures/item-list.json`](fixtures/item-list.json).
ERP: `apps/api/src/reports/inventory.ts` (`itemList`), loader `loadItemList`; test: `apps/api/test/inventory.test.ts`.
Default-params capture: [`captures/ItemListReport.json`](captures/ItemListReport.json).

## Parameters

`ASOF`: `{"asOfDate":"dd/MM/yyyy","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`. Selection: item categories (all).

## Layout

```
Daftar Barang dan Jasa / Per Tgl. 30 Nov 2033 / Cabang : [Semua Cabang]
Kode Barang | Nama Barang | Jenis Barang | Def. Hrg. Jual Satuan #1 | Kts (Semua Gdng)
Umum                                   <- one heading per item category (category name order)
NL-T2-S1 | NL-T2 Jasa Konsultasi | Jasa | 0 | 0
NL-T4-B1 | NL-T4 Barang A | Persediaan | 0 | 10
```

## Calculation rules

- Every item is listed, whether or not it has transactions; categories with no items still print their heading.
- Rows within a category are in **creation order**, not code order (NL-T19-S1 follows NL-T4-B1).
- Jenis Barang: SERVICE → Jasa, INVENTORY → Persediaan (demo also shows Biaya Produksi for production-cost items).
- Kts = quantity on hand across all warehouses, all stock moves dated on or before the as-of date (10 at 30 Nov 2033,
  18 at 31 Dec 2035 after later fixtures). Services show 0.
- Def. Hrg. Jual = the item's default unit-1 selling price; NL items have none (0).
- Items created after the as-of date are still listed (NL-T19-S1 appears as of 2033).

## Open work

- Item categories and default selling prices are not modelled; the ERP puts every item in "Umum" with price 0.
