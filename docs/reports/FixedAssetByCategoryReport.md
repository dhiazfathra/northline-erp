# Aset Tetap per Kategori (`FixedAssetByCategoryReport`)

Group: Aset Tetap. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/fixed-asset-t5.json`](fixtures/fixed-asset-t5.json) (one asset bought 15 Jan 2034, 12.000.000, 24 months, month-end Jan–Mar). ERP: `apps/api/src/reports/fixed-assets.ts`, `src/fixed-assets/service.ts` (ADR-0007); test: `apps/api/test/fixed-assets.test.ts`.

Params: `asOfDate`. As Daftar Aset Tetap plus `Penyusutan Tahun ini` (depreciation dated in the year of `asOfDate`), grouped by asset category (`ZZ-R03-Elektronik C` for the fixture asset), category totals.
