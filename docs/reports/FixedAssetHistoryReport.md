# Histori Aset (`FixedAssetHistoryReport`)

Group: Aset Tetap. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/fixed-asset-t5.json`](fixtures/fixed-asset-t5.json) (one asset bought 15 Jan 2034, 12.000.000, 24 months, month-end Jan–Mar). ERP: `apps/api/src/reports/fixed-assets.ts`, `src/fixed-assets/service.ts` (ADR-0007); test: `apps/api/test/fixed-assets.test.ts`.

Params: `startDate`, `endDate`, `selectedAsset`. Header: asset name, number, purchase date, life in years and remaining months, method `Metode Garis Lurus`. Rows: `<day before> | Saldo Awal | 0 | 0 | <book value> | 0 | 0`; acquisition `<date> | <asset no> | Aset Tetap | <cost> | 0 | <book> | 0 | 0`; per depreciation `<date> | <JV number> | Penyusutan Aset <no>, <previous dd/mm/yyyy> sampai <dd/mm/yyyy> | 0 | <amount> | <book> | -<amount> | 0`. The "previous" date is the purchase date for the first depreciation, then the previous depreciation date. Each depreciation has its own JV number from the month's Jurnal Umum counter (see ADR-0007).

Disposed assets (verified with `asset-disposal-t11.json`): header labels print without values and no rows are listed.
