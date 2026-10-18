# Pesanan Pembelian per Barang (`PurchaseOrderByItemReport`)

Group: Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/purchase-order-t9.json`](fixtures/purchase-order-t9.json) (PO.2034.06.00001, RI.2034.06.00001, PI.2034.06.00001, **unlinked** in Accurate). ERP: `apps/api/src/reports/payables.ts`; test: `apps/api/test/purchase-orders.test.ts`.

Columns `Nama Barang Barang & Jasa` | `Kts (Unit#1)` | `Kts Terproses` | `Total Harga`; header line adds `Filter berdasarkan : Status …`. Kts Terproses verified only at 0 (unlinked order).

Unverified: linked order → receipt → invoice (processed quantities, shared flow rows).
