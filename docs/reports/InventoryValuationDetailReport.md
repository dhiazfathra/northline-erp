# Rincian Nilai Persediaan (`InventoryValuationDetailReport`)

Group: Persediaan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/inventory-t4.json`](fixtures/inventory-t4.json) (3 purchases, 2 sales of NL-T4-B1, Oct–Nov 2033). ERP: `apps/api/src/reports/inventory.ts`, costing `src/inventory/fifo.ts` (ADR-0006); test: `apps/api/test/inventory.test.ts`.

Params as the stock card. Header `Nomor #` | `Tanggal` | `Kts Masuk` | `Nilai Masuk` | `Kts Keluar` | `Nilai Keluar` | `Kts Akhir` | `Nilai Akhir`; opening row with the day before; one row per movement with FIFO values and running quantity/value; totals of in/out quantity and value.

Opening and totals (verified with `returns-t6.json`): the opening row prints quantity and value in the **Masuk** columns, and the in-totals include them (`12 | 167.200 | 1 | 13.000`).

## Trade Portal Demo variation (2026-10-19): average costing

Source: Trade Portal Demo (PT Automotive Shop): NL-TP-B1 bought 10 @ 100.000 (PI.2045.03.00003, 5 Mar) and 10 @ 120.000 (PI.2045.03.00004, 12 Mar) from Supplier Umum, sold 15 @ 200.000 (SI.2045.03.00001, 20 Mar) to Andika Motor, net 30.
Trade Portal costs by moving average: SI row Nilai Keluar 1.650.000, Nilai Akhir 550.000 (average). The
report matches Trade Portal with zero diff when the company costing method is AVERAGE (ADR-0031, `ledger_settings.costing_method`). Expected output in [fixtures/trade/trade-tp.json](fixtures/trade/trade-tp.json), test `apps/api/test/trade-portal-trade.test.ts`.
Rounding (NL-TP-P3 PI.2045.05.00001: 1 @ 100.000 onto 5 @ 110.000, average 108.333,33; NL-TP-S2 SI.2045.05.00001 sells 3): Nilai Keluar 325.000, so the
average cost is rounded per line (qty x unit cost), not per unit (3 x 108.333 = 324.999). Returns (NL-TP-P4 PI.2045.05.00002 1 @ 130.000, then NL-TP-SR1 SRT.2045.05.00001 and NL-TP-PR1 PRT.2045.05.00001): a sales return
re-enters at the cost its invoice booked (108.333,33), not the average (113.750) or the last purchase (130.000); a purchase return
leaves at the current average (112.666,67), the difference to its price (17.333,33) going to Beban Pokok Penjualan. Average values
keep fractions of a cent (Nilai Akhir 450.666,67 = 563.333,333 - 112.666,667). Fixture report `InventoryValuationDetailReport:may` (1 Mar - 31 Mei 2045).
FIFO (the default) still gives 1.600.000 and stays verified on Manufaktur Demo. See ADR-0029 finding 6.
