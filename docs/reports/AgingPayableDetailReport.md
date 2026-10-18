# Rincian Umur Utang (`AgingPayableDetailReport`)

Group: Utang / Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/purchase-t3.json`](fixtures/purchase-t3.json). ERP: `apps/api/src/reports/payables.ts`; test: `apps/api/test/payables.test.ts`.

Params: `asOfDate`. Header `Nomor #` | `Tanggal` | `Utang` | buckets once, currency line, then per vendor: name, open invoices with their bucket, and a subtotal row of **six** cells: owing plus the first five buckets — the `> 120` cell is not printed (sandbox vendors entirely > 120 days show `<owing> | 0 | 0 | 0 | 0 | 0`).
