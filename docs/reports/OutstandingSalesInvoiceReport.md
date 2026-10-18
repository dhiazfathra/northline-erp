# Faktur Belum Lunas (`OutstandingSalesInvoiceReport`)

Group: Piutang. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/sales-t2.json`](fixtures/sales-t2.json) (invoices I1–I3, receipts R1–R2, Apr–Jun 2033). ERP: `apps/api/src/reports/receivables.ts`; test: `apps/api/test/receivables.test.ts`. Params: `startDate`, `endDate`, `selectedBranch` unless noted.

Params: `asOfDate`, `selectedBranch`. Currency heading, then per customer with unpaid invoices (by name): `<name> | Sisa Kredit | : | 0`, column header `Nomor #` | `Tanggal` | `Jatuh Tempo` | `Total` | `Piutang` | `Piutang Pajak` | `Umur (hr)`, one row per invoice with a remaining balance at `asOfDate` (receipts dated after `asOfDate` ignored), then `<total> | <owing> | <tax owing>`; last row grand totals. Umur = days from due date to `asOfDate`, thousands separator (`2.476`).

Unverified: Umur measured from the due date vs the invoice date (equal in this fixture), tax owing, Sisa Kredit (customer credit/overpayment).
