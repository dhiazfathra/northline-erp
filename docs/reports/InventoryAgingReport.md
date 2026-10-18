# Umur Persediaan (`InventoryAgingReport`)

Group: Persediaan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/inventory-t4.json`](fixtures/inventory-t4.json) (3 purchases, 2 sales of NL-T4-B1, Oct–Nov 2033). ERP: `apps/api/src/reports/inventory.ts`, costing `src/inventory/fifo.ts` (ADR-0006); test: `apps/api/test/inventory.test.ts`.

Params: `asOfDate`, `selectedWarehouse`, `selectedBranch`. Columns `Nama Barang` | `Stok` | `1 - 30` | `31 - 60` | `61 - 90` | `91 - 120` | `> 120`: remaining **FIFO layers** bucketed by days since their purchase (fixture: 5 left from 10 Oct and 5 from 20 Oct → 10 in 31–60 at 30 Nov).
