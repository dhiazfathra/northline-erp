# Faktur Belum Lunas per Pemasok (`OutstandingPurchaseInvoicePerVendorReport`)

Group: Utang / Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/purchase-t3.json`](fixtures/purchase-t3.json). ERP: `apps/api/src/reports/payables.ts`; test: `apps/api/test/payables.test.ts`.

Params: `asOfDate`. Columns `Mata Uang` | `Pemasok` | `Total` | `Utang` | `Utang Pajak`: one row per vendor with open invoices (currency on the first row), `Total Pemasok`, `Total Mata Uang`.
