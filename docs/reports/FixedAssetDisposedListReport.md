# Daftar Disposisi Aset Tetap (`FixedAssetDisposedListReport`)

Group: Aset Tetap. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture:
[`fixtures/asset-disposal-t11.json`](fixtures/asset-disposal-t11.json). ERP: `disposedList` in `apps/api/src/reports/fixed-assets.ts`,
`disposeFixedAsset` in `src/fixed-assets/service.ts`; test: `apps/api/test/fixed-assets.test.ts`.

Columns `Nomor #` | `Tanggal` | `Kode Aset` | `Nama Aset` | `Nama Akun Laba Rugi` | `Aset Dijual` (`Ya`/`Tidak`) | `Harga` |
`Nama Akun Penjualan` | `Keterangan`, one row per disposal in range.

Posting (type "Disposisi Aset Tetap", `FAD.yyyy.mm.nnnnn`): Dr accumulated depreciation, Dr gain/loss for the book value,
Cr asset at cost; then, if sold, Dr selling account / Cr gain/loss for the price, **not netted** (720006 appears twice).
Depreciation is not run for the disposal month. After disposal, [Histori Aset](FixedAssetHistoryReport.md) prints the asset
with empty header fields and no rows.
