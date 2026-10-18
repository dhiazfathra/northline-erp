# Pembayaran Cicilan (`SalesInvoicePaidInstallmentListReport`)

Group: Penjualan. **Status: verified** (zero diff). Fixture: [`fixtures/tax-t19.json`](fixtures/tax-t19.json) (T22 documents, `reports.SalesInvoicePaidInstallmentListReport`).
ERP: `apps/api/src/reports/receivables.ts` (`paidInstallments`), loader `loadInstallments`; test: `apps/api/test/tax.test.ts`.

## Parameters

`FROMTO`: `{"startDate":"dd/MM/yyyy","endDate":"dd/MM/yyyy"}`.

## Calculation rules

Installments paid by receipts dated in range: `Pelanggan | No Faktur # | Tanggal Cicilan | Nama Cicilan | Jumlah | Bayar | Tanggal Bayar` (receipt date).

Source: invoices on an **installment payment term** (Syarat Pembayaran with `installmentTerm`, here "NL-T22 Cicilan")
carry a schedule (`detailSchedulePayment`: installmentName / installmentDate / installmentAmount). A receipt line must
name the installment it pays (`invoiceInstallmentId`), or Accurate refuses with "Cicilan harus diisi".
Fixture T22: SI.2035.12.00001, 3 x 100.000 due 10 Dec 2035 / 10 Jan / 10 Feb 2036; Cicilan 1 paid 12 Dec 2035.

## Open work

- Partial installment payments and one receipt paying several installments are not captured yet.
