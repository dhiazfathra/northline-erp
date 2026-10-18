# Rincian Nilai Persediaan (`InventoryValuationDetailReport`)

Group: Persediaan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/inventory-t4.json`](fixtures/inventory-t4.json) (3 purchases, 2 sales of NL-T4-B1, Oct–Nov 2033). ERP: `apps/api/src/reports/inventory.ts`, costing `src/inventory/fifo.ts` (ADR-0006); test: `apps/api/test/inventory.test.ts`.

Params as the stock card. Header `Nomor #` | `Tanggal` | `Kts Masuk` | `Nilai Masuk` | `Kts Keluar` | `Nilai Keluar` | `Kts Akhir` | `Nilai Akhir`; opening row with the day before; one row per movement with FIFO values and running quantity/value; totals of in/out quantity and value.
