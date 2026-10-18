# Rincian Buku Besar Pembantu Piutang (`ARLedgerDetailReport`)

Group: Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

Columns `Nomor #` | `Tanggal` | `Deskripsi` | `Piutang`; currency heading. Per active customer: name, a `-` line, `<day before start> | Saldo Piutang per <date> | <opening>`, the opening again as a one-cell subtotal, then one group per document type (`Faktur Penjualan` positive, `Penerimaan Penjualan` negative) with its rows and subtotal, then the closing balance. Last row: sum of closings.
