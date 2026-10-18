# Profitabilitas per Pelanggan (`ProfitabilityByCustomerReport`)

Group: Penjualan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture:
[`fixtures/inventory-t4.json`](fixtures/inventory-t4.json). ERP: `profitabilityByCustomer` in `apps/api/src/reports/receivables.ts`
with FIFO cost per invoice from `stock_moves`; test: `apps/api/test/inventory.test.ts`.

Columns `Pelanggan` | `Penjualan` | `BPP` | `Biaya Tambahan` | `Biaya Penerimaan` | `Laba setelah Biaya`. One row per customer with
invoices in range (by name): invoice totals, FIFO cost of goods of those invoices (0 for services), margin; `Total Pelanggan`.
Fixture: A 160.000 − 80.000, B 147.000 − 85.000.
