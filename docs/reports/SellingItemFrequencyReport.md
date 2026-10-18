# Barang Paling Laku (`SellingItemFrequencyReport`)

Group: Penjualan. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/SellingItemFrequencyReport.json`](captures/SellingItemFrequencyReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.

| Name | Type | Default | Label |
|---|---|---|---|
| `selectedBranch` | BRANCH_MULTI_WITH_ALL_BRANCH | [] | Cabang |

Selection: `ITEM_CATEGORY_ALL`.

## Layout

View: `report`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026", "Cabang : [Semua Cabang]".


First table row (columns): `Kode Barang | Nama Barang | Frekuensi (x Terjual) | Kuantitas | Nilai Total`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
