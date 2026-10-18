# Histori Perubahan Aset (`FixedAssetEditedHistoryReport`)

Group: Aset Tetap. **Status: verified** (zero diff, T5 asset with the T11 disposal, 2034). Fixture: [`fixtures/asset-disposal-t11.json`](fixtures/asset-disposal-t11.json) (`reports.FixedAssetEditedHistoryReport`).
ERP: `apps/api/src/reports/fixed-assets.ts` (`fixedAssetEditedHistory`); test: `apps/api/test/fixed-assets.test.ts`.

## Parameters

`startDate` / `endDate` (dd/MM/yyyy) + `selectedAsset` = array of `{id}`.

## Layout

`Kode Aset : <no> | Umur (Tahun) : <y>`, `Tanggal Beli : <date> | Umur (Bulan) : <m>`, `Metode Penyusutan : <method>`, then
`Tanggal | Nomor # | Tipe | Keterangan | Kode Aset | Tanggal Beli | Metode Penyusutan | Umur (Tahun) | Umur (Bulan)`.

## Calculation rules

- One row per change document dated in the window. A disposal prints Tipe `Disposisi` and a generated Keterangan
  `Disposisi 1, dijual senilai <price>` with en-US digit grouping (`11,000,000`), not the disposal's own description.
- The asset columns repeat the asset's data after the change (code, purchase date, method, life).
- The acquisition itself is not a change and does not print.
- An asset edit prints Tipe `Data` with a generated Keterangan `Perubahan Perkiraan Umur dari <old> Tahun menjadi <new> Tahun`
  (T34, [`fixtures/asset-edit-t34.json`](fixtures/asset-edit-t34.json)). The asset columns show the life after the change.

## Open work

- Unsold-disposal wording is not captured.
