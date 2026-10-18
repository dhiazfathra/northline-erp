# Buku Besar Pembantu Piutang (`ARLedgerReport`)

Group: Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json) (invoices I1–I3, receipts R1–R2, Apr–Jun 2033). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`. Params: `startDate`, `endDate`, `selectedBranch` unless noted.

Columns `Nama Pelanggan` | `Saldo Awal` | `Faktur` | `Pembayaran` | `Retur` | `Uang Muka` | `Jurnal Umum` | `Saldo Akhir`, under a currency heading.

1. Only customers with a movement in the range are listed (sandbox customers with an opening balance but no movement are absent).
2. Saldo Awal = invoices − receipts before `startDate`; Saldo Akhir = awal + faktur − pembayaran (− retur − uang muka ± jurnal, unverified).
3. Last row: column totals.

Returns (verified with `returns-t6.json`): the `Retur` column holds sales returns in range; Saldo Akhir = awal + faktur − pembayaran − retur.

Down payments (verified with `downpayment-t7.json`): a DP invoice (type Uang Muka Penjualan, SI numbering, Dr Piutang / Cr Uang Muka Penjualan) counts in **Faktur** and again in **Uang Muka**; an invoice using a DP counts its full total in Faktur. Saldo Akhir = awal + faktur − pembayaran − retur − uang muka.
