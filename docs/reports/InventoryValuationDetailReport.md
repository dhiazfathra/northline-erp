# Rincian Nilai Persediaan (`InventoryValuationDetailReport`)

Group: Persediaan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/inventory-t4.json`](fixtures/inventory-t4.json) (3 purchases, 2 sales of NL-T4-B1, Oct–Nov 2033). ERP: `apps/api/src/reports/inventory.ts`, costing `src/inventory/fifo.ts` (ADR-0006); test: `apps/api/test/inventory.test.ts`.

Params as the stock card. Header `Nomor #` | `Tanggal` | `Kts Masuk` | `Nilai Masuk` | `Kts Keluar` | `Nilai Keluar` | `Kts Akhir` | `Nilai Akhir`; opening row with the day before; one row per movement with FIFO values and running quantity/value; totals of in/out quantity and value.

Opening and totals (verified with `returns-t6.json`): the opening row prints quantity and value in the **Masuk** columns, and the in-totals include them (`12 | 167.200 | 1 | 13.000`).

## Trade Portal Demo variation (2026-10-19): blocked, requires average costing

Source: Trade Portal Demo (PT Automotive Shop): NL-TP-B1 bought 10 @ 100.000 (PI.2045.03.00003, 5 Mar) and 10 @ 120.000 (PI.2045.03.00004, 12 Mar) from Supplier Umum, sold 15 @ 200.000 (SI.2045.03.00001, 20 Mar) to Andika Motor, net 30.
Trade Portal costs by moving average: SI row Nilai Keluar 1.650.000, Nilai Akhir 550.000 (average). The ERP costs by FIFO (1.600.000 for the same sale), so this
report cannot match Trade Portal until the AVERAGE strategy of ADR-0031 lands. Expected output kept in [fixtures/trade/trade-tp.json](fixtures/trade/trade-tp.json), test `apps/api/test/trade-portal-trade.test.ts`
(the test pins the current FIFO gap and flips to zero diff once average costing exists). See ADR-0029 finding 6.
