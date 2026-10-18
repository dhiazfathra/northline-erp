# Daftar Aset Tetap (`FixedAssetListReport`)

Group: Aset Tetap. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/fixed-asset-t5.json`](fixtures/fixed-asset-t5.json) (one asset bought 15 Jan 2034, 12.000.000, 24 months, month-end Jan–Mar). ERP: `apps/api/src/reports/fixed-assets.ts`, `src/fixed-assets/service.ts` (ADR-0007); test: `apps/api/test/fixed-assets.test.ts`.

No date parameter (as of today). Columns `Nomor #` | `Nama Aset` | `Total Aset` | `Penyusutan` | `Nilai Buku` | `Tanggal Pakai` | `Tanggal Beli`, grouped by tangibility (`Berwujud`), assets by number, group totals. Penyusutan = depreciation posted by month-end so far.
