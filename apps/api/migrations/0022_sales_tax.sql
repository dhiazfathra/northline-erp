-- PPN on sales invoices (docs/reports/TaxationOutReport.md): the item's default tax applies when the invoice is taxable.
ALTER TABLE taxes ADD COLUMN sales_account text REFERENCES accounts (no);
ALTER TABLE items ADD COLUMN tax_name text REFERENCES taxes (name), ADD COLUMN sales_discount_account text REFERENCES accounts (no);
ALTER TABLE sales_invoices ADD COLUMN discount bigint NOT NULL DEFAULT 0, ADD COLUMN tax_date date, ADD COLUMN tax_number text;
ALTER TABLE sales_invoice_lines ADD COLUMN disc_pct numeric NOT NULL DEFAULT 0;
CREATE TABLE sales_invoice_taxes (
  invoice_number text NOT NULL REFERENCES sales_invoices (number),
  tax_name       text NOT NULL REFERENCES taxes (name),
  rate           numeric NOT NULL,
  dpp            bigint NOT NULL,
  amount         bigint NOT NULL,
  PRIMARY KEY (invoice_number, tax_name)
);
