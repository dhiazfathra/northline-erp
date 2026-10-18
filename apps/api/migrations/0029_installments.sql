-- Cicilan (docs/reports/SalesInvoiceUnpaidInstallmentListReport.md): an invoice on an installment term carries a
-- schedule; each receipt line may pay one installment.
CREATE TABLE sales_invoice_installments (
  invoice_number text NOT NULL REFERENCES sales_invoices (number),
  seq            integer NOT NULL,
  name           text NOT NULL,
  due_date       date NOT NULL,
  amount         bigint NOT NULL,
  PRIMARY KEY (invoice_number, seq)
);
ALTER TABLE sales_receipt_lines ADD COLUMN installment_seq integer;
