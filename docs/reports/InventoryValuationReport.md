# Nilai Persediaan (`InventoryValuationReport`)

Group: Persediaan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/inventory-t4.json`](fixtures/inventory-t4.json) (3 purchases, 2 sales of NL-T4-B1, Oct–Nov 2033). ERP: `apps/api/src/reports/inventory.ts`, costing `src/inventory/fifo.ts` (ADR-0006); test: `apps/api/test/inventory.test.ts`.

Params: `startDate`, `endDate`, `selectedBranch`. Two header rows: `Nama Barang` | `Kode Barang` | `Saldo Awal` | `Masuk` | `Keluar` | `Saldo Akhir`, then quantity/value pairs. One row per stock item by name (zero rows included), opening before `startDate`, ins and outs at FIFO cost, closing; `Total Nama Barang`. Fixture NL-T4-B1: 0 | 0 | 25 | 303.000 | 15 | 165.000 | 10 | 138.000.

## Trade Portal Demo variation (2026-10-19): blocked, requires average costing

Source: Trade Portal Demo (PT Automotive Shop): NL-TP-B1 bought 10 @ 100.000 (PI.2045.03.00003, 5 Mar) and 10 @ 120.000 (PI.2045.03.00004, 12 Mar) from Supplier Umum, sold 15 @ 200.000 (SI.2045.03.00001, 20 Mar) to Andika Motor, net 30.
Trade Portal costs by moving average: Keluar 15 / 1.650.000, Saldo Akhir 5 / 550.000 (average 110.000). The ERP costs by FIFO (1.600.000 for the same sale), so this
report cannot match Trade Portal until the AVERAGE strategy of ADR-0031 lands. Expected output kept in [fixtures/trade/trade-tp.json](fixtures/trade/trade-tp.json), test `apps/api/test/trade-portal-trade.test.ts`
(the test pins the current FIFO gap and flips to zero diff once average costing exists). See ADR-0029 finding 6.
