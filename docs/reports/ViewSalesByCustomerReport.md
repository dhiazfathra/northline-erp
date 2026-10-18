# Penjualan per Pelanggan (`ViewSalesByCustomerReport`)

Group: Penjualan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json) (invoices I1–I3, receipts R1–R2, Apr–Jun 2033). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`. Params: `startDate`, `endDate`, `selectedBranch` unless noted.

Columns `Pelanggan` | `Penjualan`. One row per customer with invoices in range (invoice totals, before tax in this fixture), by customer name; last row `Total Pelanggan`.

Unverified: discounts, tax, returns (crosstab view may net returns).
