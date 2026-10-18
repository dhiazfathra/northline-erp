# Rincian Penerimaan Penjualan (`SalesReceiptListDetailReport`)

Group: Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

One block per receipt in range (date order), title lines repeated: `No. Form : <number>  Bank : <bank name>`, `Tgl Pembayaran : <date>  Mata Uang : Indonesian Rupiah`, `Pelanggan : <name>`, `Nilai Pembayaran :` (the amount itself is not printed), header `No. Faktur` | `Tgl Faktur` | `Total Faktur` | `Bayar` | `Diskon` | `Pembayaran`, one row per invoice paid, then `<bayar> | <diskon> | <pembayaran>` totals.
