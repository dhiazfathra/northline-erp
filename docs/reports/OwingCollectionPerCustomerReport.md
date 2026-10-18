# Rata-rata Pembayaran Pelanggan (`OwingCollectionPerCustomerReport`)

Group: Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

Columns `Nama Pelanggan` | `Bayar (Hari)` | `Syarat Bayar (Hari)` | `Nunggak (Hari)`. Customers with invoices fully settled by a receipt dated in the range (partial payments do not count: customer A is absent). Bayar = average days from invoice date to the settling receipt (fixture: 20 Apr → 15 Jun = 56); Syarat = average payment-term days (0); Nunggak = Bayar − Syarat.

Unverified: rounding of the averages with several invoices.
