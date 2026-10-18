# Pembayaran Faktur (`SalesInvoicePaidReport`)

Group: Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`.

Columns `No. Form` | `Tgl Pembayaran` | `Bank` | `Total Faktur` | `Total pemotongan PPh23` | `Pembayaran`; currency heading. Per customer with receipts in range: name; per paid invoice: its number, one row per receipt that paid it (receipt number, date, bank account name, invoice total, PPh 23 withheld, amount applied), then the amount-applied subtotal.
