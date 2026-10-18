# Faktur Belum Lunas (Utang) (`OutstandingPurchaseInvoiceReport`)

Group: Utang / Pembelian. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/purchase-t3.json`](fixtures/purchase-t3.json) (purchase invoices P1–P3, payments W1–W2, Jul–Aug 2033). ERP: `apps/api/src/reports/payables.ts` and the shared functions in `receivables.ts` with payable labels; test: `apps/api/test/payables.test.ts`.

Params: `asOfDate`, `selectedBranch`. Unlike the receivable version, the column header (`Nomor #` | `Tanggal` | `Jatuh Tempo` | `Total` | `Utang` | `Utang Pajak` | `Umur (hr)`) comes **before** the currency line and is not repeated per vendor; vendor rows hold only the name (no "Sisa Kredit"). Per vendor: open invoices at `asOfDate`, then `<total> | <owing> | <tax owing>`; last row grand totals. Umur = days since the due date.

Source journals: purchase invoice Dr item expense account (merged per account, listed first) / Cr vendor payable; payment Dr payable / Cr bank.
