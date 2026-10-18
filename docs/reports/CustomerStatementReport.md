# Pernyataan Piutang (`CustomerStatementReport`)

Group: Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json) (invoices I1–I3, receipts R1–R2, Apr–Jun 2033). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`. Params: `startDate`, `endDate`, `selectedBranch` unless noted.

One statement per active customer: `Pelanggan : <name>  Email :`, `Handphone : Alamat :`, `Faximili :` (contact fields), column header `Nomor #` | `Tanggal` | `Deskripsi` | `Bertambah` | `Berkurang` | `Saldo`, currency heading, `Saldo Piutang per <day before startDate> | 0 | 0 | <opening>`, document rows with a running balance, then `<total bertambah> | <total berkurang>`. The title, period and branch lines repeat per customer.
