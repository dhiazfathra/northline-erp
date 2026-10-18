# Histori Lokasi Aset (`AssetLocationHistoryReport`)

Group: Aset Tetap. **Status: verified** (zero diff, T5 asset after the T11 disposal). Fixture: [`fixtures/asset-disposal-t11.json`](fixtures/asset-disposal-t11.json) (`reports.AssetLocationHistoryReport`).
ERP: `apps/api/src/reports/fixed-assets.ts` (`assetLocationHistory`); test: `apps/api/test/fixed-assets.test.ts`.

## Parameters

No date. `selectedAsset` = array of `{id}` (FAA.2034.01.00001 = 150). With `[]` only the label rows print.

## Layout

Per asset: `Nomor # : <no> | Umur (Tahun) : <y>`, `Tanggal : <purchase date> | Umur (Bulan) : <m>`,
`Metode Penyusutan : <method> | Nama Lokasi Awal Aset : <branch>`, then
`Tanggal | No. | Keterangan | Kuantitas | Lokasi Aset | Alamat Asal`.

## Calculation rules

- Acquisition row: purchase date, asset number, asset description, quantity `1`, initial location (branch, "Kantor Pusat").
- Disposal row: disposal date and number, disposal description, quantity `-1`, same location.
- Umur = useful life split into whole years and remaining months (24 months = 2 / 0).
- Alamat Asal is empty (the trailing cell is dropped).

## Open work

- Asset location transfers are not modelled (`shortcut:` in the code); every asset sits at the default branch.
