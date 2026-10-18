# Rincian Faktur Pembelian (`PurchaseInvoiceDetailReport`)

Group: Utang / Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/purchase-t3.json`](fixtures/purchase-t3.json). ERP: `apps/api/src/reports/payables.ts`; test: `apps/api/test/payables.test.ts`.

One block per invoice (title lines repeated): `Nomor # : <no>  Mata Uang : Indonesian Rupiah`, `Tanggal : <date>  Sub Total : <subtotal>`, `Pemasok : <name>  Total Biaya : 0`, `Nama Biaya :  Total : <total>`, header `Kode #` | `Nama Barang` | `Kuantitas` | `@Harga` | `Total Harga`, lines, then `<qty> | <total>`. Field order differs from the sales version.
