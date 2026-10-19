# Profitabilitas per Barang (`ProfitabilityByItemReport`)

Group: Persediaan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/inventory-t4.json`](fixtures/inventory-t4.json) (3 purchases, 2 sales of NL-T4-B1, Oct–Nov 2033). ERP: `apps/api/src/reports/inventory.ts`, costing `src/inventory/fifo.ts` (ADR-0006); test: `apps/api/test/inventory.test.ts`.

Columns `Nama Barang` | `Penjualan` | `BPP` | `Biaya Tambahan` | `Biaya Penerimaan` | `Laba setelah Biaya`: items sold in range, FIFO cost of those sales, margin; `Total Nama Barang`. Fixture: 307.000 − 165.000 = 142.000.

## Trade Portal Demo variation (2026-10-19): average costing

Source: Trade Portal Demo (PT Automotive Shop): NL-TP-B1 bought 10 @ 100.000 (PI.2045.03.00003, 5 Mar) and 10 @ 120.000 (PI.2045.03.00004, 12 Mar) from Supplier Umum, sold 15 @ 200.000 (SI.2045.03.00001, 20 Mar) to Andika Motor, net 30.
Trade Portal costs by moving average: BPP 1.650.000 = 15 x average 110.000. The
report matches Trade Portal with zero diff when the company costing method is AVERAGE (ADR-0031, `ledger_settings.costing_method`). Expected output in [fixtures/trade/trade-tp.json](fixtures/trade/trade-tp.json), test `apps/api/test/trade-portal-trade.test.ts`.
FIFO (the default) still gives 1.600.000 and stays verified on Manufaktur Demo. See ADR-0029 finding 6.
