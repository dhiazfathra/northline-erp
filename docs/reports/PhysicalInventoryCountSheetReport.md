# Lembar Penghitungan Stok (`PhysicalInventoryCountSheetReport`)

Group: Gudang. **Status: verified** (zero diff on the NL block, both warehouses). Fixture: [`fixtures/count-sheet.json`](fixtures/count-sheet.json).
ERP: `apps/api/src/reports/inventory.ts` (`countSheet`), loader `loadItemList`; test: `apps/api/test/adjustments.test.ts`.

## Parameters

`ASOF` + `selectedWarehouse` as an **array of `{id}`** (`null`, the default, makes Accurate fail) + `selectedBranch`.

## Layout

```
Lembar Penghitungan Stok / Per Tgl. 30 Nov 2034 / Cabang : [Semua Cabang]
Kode Barang | Nama Barang | Kuantitas | Satuan | Hitung #1 | Hitung #2
Umum
NL-T2-S1 | NL-T2 Jasa Konsultasi | 0 | Jam
NL-T4-B1 | NL-T4 Barang A | 13 | PCS        <- Utama; 5 in NL-Gudang B
```

## Calculation rules

- Same item set, category blocks and creation order as [Daftar Barang dan Jasa](ItemListReport.md); services listed with 0.
- Kuantitas = stock moves in the selected warehouse dated on or before the as-of date (transfers count on each side).
- Satuan = the item's unit; demo items without a unit print no cell. Hitung #1/#2 are blank write-in columns.
