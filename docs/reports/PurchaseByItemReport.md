# Pembelian per Barang (`PurchaseByItemReport`)

Group: Utang / Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/purchase-t3.json`](fixtures/purchase-t3.json). ERP: `apps/api/src/reports/payables.ts`; test: `apps/api/test/payables.test.ts`.

Columns `Nama Barang` | `Kts (Unit#1)` | `Pembelian`: quantity in the first unit, one row per item purchased in range, `Total Nama Barang`. Item master names.
