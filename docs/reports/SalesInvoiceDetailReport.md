# Rincian Faktur Penjualan (`SalesInvoiceDetailReport`)

Group: Penjualan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

One block per invoice in range (title lines repeat): `Nomor # : <no>  Nama Biaya :`, `Tanggal : <date>  Sub Total : <subtotal>`, `Pelanggan : <name>  Total Biaya : 0`, `Mata Uang : Indonesian Rupiah  Total : <total>`, header `Kode #` | `Nama Barang` | `Kuantitas` | `@Harga` | `Total Harga`, one row per line, then `<qty> | <total>`. Item rows print the **item master name and unit**, not the invoice line description (fixture line "NL-T2 Jasa Konsultasi lanjutan" prints as "NL-T2 Jasa Konsultasi"). Quantities print with the id-ID format.
