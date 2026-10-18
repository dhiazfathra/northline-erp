# Penerimaan Penjualan (`SalesReceiptListReport`)

Group: Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json) (invoices I1–I3, receipts R1–R2, Apr–Jun 2033). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`. Params: `startDate`, `endDate`, `selectedBranch` unless noted.

Columns `Nomor #` | `Tanggal` | `No. Cek` | `Tanggal Cek` | `Pelanggan` | `Nilai Pembayaran`, under a currency heading (`Indonesian Rupiah`). Receipts in range **newest first**; cheque date defaults to the receipt date; an empty cheque number prints nothing. Last row: total.
