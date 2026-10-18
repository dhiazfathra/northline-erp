# Faktur Belum Lunas per Pelanggan (`OutstandingSalesInvoicePerCustomerReport`)

Group: Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

Params: `asOfDate`, `selectedBranch`. Columns `Mata Uang` | `Pelanggan` | `Total` | `Piutang` | `Piutang Pajak`; one row per customer with open invoices (invoice totals and remaining balances), the currency name on the first row; rows `Total Pelanggan`, `Total Mata Uang`.
