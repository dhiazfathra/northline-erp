-- PPN Masukan on purchase invoices (docs/reports/TaxationInReport.md), mirror of 0022 for sales.
ALTER TABLE taxes ADD COLUMN purchase_account text REFERENCES accounts (no);
ALTER TABLE purchase_invoices ADD COLUMN tax_date date, ADD COLUMN tax_number text;
CREATE TABLE purchase_invoice_taxes (
  invoice_number text NOT NULL REFERENCES purchase_invoices (number),
  tax_name       text NOT NULL REFERENCES taxes (name),
  rate           numeric NOT NULL,
  dpp            bigint NOT NULL,
  amount         bigint NOT NULL,
  PRIMARY KEY (invoice_number, tax_name)
);
