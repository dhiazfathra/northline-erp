# Rincian Pembayaran Pembelian (`PurchasePaymentListDetailReport`)

Group: Utang / Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/purchase-t3.json`](fixtures/purchase-t3.json). ERP: `apps/api/src/reports/payables.ts`; test: `apps/api/test/payables.test.ts`.

One block per payment (date order, title lines repeated): `Pemasok : <name>  Nama Bank : <bank>`, `No Bukti # : <number>  Metode Bayar : Tunai`, `Tgl Bayar : <date>`, `Nilai Pembayaran` then `: <amount>` (printed here, unlike the receipt version), header `No. Faktur` | `Tgl Faktur` | `Total Faktur` | `Bayar` | `Diskon` | `Pembayaran` where **No. Faktur is the vendor's own bill number**, then totals.
