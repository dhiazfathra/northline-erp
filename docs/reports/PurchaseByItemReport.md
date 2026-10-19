# Pembelian per Barang (`PurchaseByItemReport`)

Group: Utang / Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/purchase-t3.json`](fixtures/purchase-t3.json). ERP: `apps/api/src/reports/payables.ts`; test: `apps/api/test/payables.test.ts`.

Columns `Nama Barang` | `Kts (Unit#1)` | `Pembelian`: quantity in the first unit, one row per item purchased in range, `Total Nama Barang`. Item master names.

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop): NL-TP-B1 bought 10 @ 100.000 (PI.2045.03.00003, 5 Mar) and 10 @ 120.000 (PI.2045.03.00004, 12 Mar) from Supplier Umum, sold 15 @ 200.000 (SI.2045.03.00001, 20 Mar) to Andika Motor, net 30.
Fixture [fixtures/trade/trade-tp.json](fixtures/trade/trade-tp.json), test `apps/api/test/trade-portal-trade.test.ts`: zero diff. Same columns and rule. See ADR-0029.
