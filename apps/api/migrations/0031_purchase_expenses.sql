-- Biaya tab of Faktur Pembelian (docs/reports/PurchaseByExpenseReport.md).
CREATE TABLE purchase_invoice_expenses (
  invoice_number text NOT NULL REFERENCES purchase_invoices(number),
  seq int NOT NULL,
  account_no text NOT NULL REFERENCES accounts(no),
  name text NOT NULL DEFAULT '',
  amount bigint NOT NULL,
  PRIMARY KEY (invoice_number, seq)
);
