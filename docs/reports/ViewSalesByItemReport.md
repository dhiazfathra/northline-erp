# Penjualan per Barang (`ViewSalesByItemReport`)

Group: Penjualan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

Columns `Nama Barang` | `Satuan` | `Kuantitas` | `Penjualan`; one row per item sold in range, by name; `Total Nama Barang`. Item rows print the **item master name and unit**, not the invoice line description (fixture line "NL-T2 Jasa Konsultasi lanjutan" prints as "NL-T2 Jasa Konsultasi"). Quantities print with the id-ID format.

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop): NL-TP-B1 bought 10 @ 100.000 (PI.2045.03.00003, 5 Mar) and 10 @ 120.000 (PI.2045.03.00004, 12 Mar) from Supplier Umum, sold 15 @ 200.000 (SI.2045.03.00001, 20 Mar) to Andika Motor, net 30.
Fixture [fixtures/trade/trade-tp.json](fixtures/trade/trade-tp.json), test `apps/api/test/trade-portal-trade.test.ts`: zero diff. Same columns and rule. See ADR-0029.
