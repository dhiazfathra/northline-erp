# Rincian Pembelian per Barang (`PurchaseByItemDetailReport`)

Group: Utang / Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/purchase-t3.json`](fixtures/purchase-t3.json). ERP: `apps/api/src/reports/payables.ts`; test: `apps/api/test/payables.test.ts`.

Columns `Nomor #` | `Tanggal` | `Keterangan` | `Kuantitas` | `Satuan` | `Pembelian`. Per item: name and one row per invoice line; **no** subtotal or total rows (unlike the sales version).
