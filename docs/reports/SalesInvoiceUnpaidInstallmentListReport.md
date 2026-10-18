# Cicilan Belum Terbayar (`SalesInvoiceUnpaidInstallmentListReport`)

Group: Penjualan. **Status: verified** (zero diff). Fixture: [`fixtures/tax-t19.json`](fixtures/tax-t19.json) (T22 documents, `reports.SalesInvoiceUnpaidInstallmentListReport`).
ERP: `apps/api/src/reports/receivables.ts` (`unpaidInstallments`), loader `loadInstallments`; test: `apps/api/test/tax.test.ts`.

## Parameters

`ASOF`: `{"asOfDate":"dd/MM/yyyy"}`.

## Calculation rules

Installments due **on or before** the date that are **still unpaid now**: payment status is current, not as-of (as of 11 Dec, the installment paid on 12 Dec is already gone; as of 31 Dec nothing is due and unpaid; as of 15 Jan, Cicilan 2). Bayar = paid so far (0), Tanggal Bayar blank (cell dropped). Rows by due date.

Source: invoices on an **installment payment term** (Syarat Pembayaran with `installmentTerm`, here "NL-T22 Cicilan")
carry a schedule (`detailSchedulePayment`: installmentName / installmentDate / installmentAmount). A receipt line must
name the installment it pays (`invoiceInstallmentId`), or Accurate refuses with "Cicilan harus diisi".
Fixture T22: SI.2035.12.00001, 3 x 100.000 due 10 Dec 2035 / 10 Jan / 10 Feb 2036; Cicilan 1 paid 12 Dec 2035.

## Open work

- Partial installment payments and one receipt paying several installments are not captured yet.
