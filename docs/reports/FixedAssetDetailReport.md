# Detail Aset Tetap (`FixedAssetDetailReport`)

Group: Aset Tetap. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/fixed-asset-t5.json`](fixtures/fixed-asset-t5.json) (one asset bought 15 Jan 2034, 12.000.000, 24 months, month-end Jan–Mar). ERP: `apps/api/src/reports/fixed-assets.ts`, `src/fixed-assets/service.ts` (ADR-0007); test: `apps/api/test/fixed-assets.test.ts`.

Params: `selectedAsset`. Header as Histori Aset; one row per expenditure: `Nama Biaya` | `Tanggal` | `Pengeluaran` | amount | asset no | purchase date | method | life years | life months.
