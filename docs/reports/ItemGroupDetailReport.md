# Barang Grup (`ItemGroupDetailReport`)

Group: Persediaan. **Status: verified** (zero diff: the seeded group and the empty state). Fixture: [`fixtures/item-group-t32.json`](fixtures/item-group-t32.json).
ERP: `apps/api/src/reports/inventory.ts` (`itemGroupDetail`), loader `loadItemGroups`; item type `GROUP` with
`components` in `upsertItem` (migration 0035); test: `apps/api/test/purchases-2036.test.ts`.

## Parameters

`selectedBranch` (`[{"name":"[Semua Cabang]","id":null}]`). No date: it lists the item master as it is now.

## Layout

Per group item, in creation order:
- `Kode Barang Grup Barang : <no> | Satuan : <unit>`
- `Nama Barang Grup Barang : <name>`
- `Kode Barang Barang & Jasa | Nama Barang | Kuantitas | Satuan`
- one row per component, in entry order

With no group item, the three label rows print with empty values.

## Calculation rules

- Pure master data: the component quantities as entered, no stock or value.
- T32: NL-T32-G1 "NL-T32 Paket" (PCS) = 2 x NL-T4-B1 + 1 x NL-T30-B1.

## Seeding notes

`save-item.mjs` with `itemType: GROUP` and `detailGroup[n]._status=insert`, `.itemId`, `.itemUnitId`, `.quantity`. It also
needs the GL account ids, like stock items.

## Open work

- Selling a group item (stock moves of components) is not modelled.
