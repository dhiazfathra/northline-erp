# Daftar Perubahan Aset Tetap (`FixedAssetEditedListReport`)

Group: Aset Tetap. **Status: verified** (zero diff, 2 windows around one asset edit). Fixture: [`fixtures/asset-edit-t34.json`](fixtures/asset-edit-t34.json).
ERP: `apps/api/src/reports/fixed-assets.ts` (`fixedAssetEditedList`), service `editFixedAsset` (migration 0037);
test: `apps/api/test/fixed-assets.test.ts`.

## Parameters

`startDate` / `endDate` (dd/MM/yyyy).

## Layout

`Nomor # | Tanggal | Kode Aset | Nama | Tipe | Keterangan | Pengeluaran`, one row per Perubahan Aset Tetap document dated in
the window.

## Calculation rules

- Lists asset edit documents (`FAE.yyyy.mm.nnnnn`) only. Disposals do not appear: 2034, with the T11 disposal, printed
  the header only.
- A data change (useful life 1 -> 2 years) prints Tipe `Data` and the document's own description. Pengeluaran is empty,
  so the cell is dropped.
- The edit posts no journal; the GL for Dec 2036 shows only the acquisition.

## Seeding notes

The asset is saved with `/accurate/fixed-asset/save-fixed-asset.do` (flat `param.*`). It needs `faTypeId`, the three
account ids and `detailExpenditure[0]` (`detailName`, `detailDate`, `detailType: EXPENDITURE`, `accountId`, `amount`,
`expenseAmount`). The edit uses `save-fixed-asset-edited.do` with `fixedAssetId`, `editedType: EDITED` and the new
`estimatedLifeYear`/`estimatedLifeMonth`.

## Open work

- Cost revaluations, method changes and expenditure edits (the Pengeluaran column) are not captured.
