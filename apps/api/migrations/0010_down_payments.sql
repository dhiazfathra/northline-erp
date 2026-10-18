-- Down payments are invoices of kind 'DP' (they share the SI numbering); later invoices record how much DP they use.
ALTER TABLE sales_invoices ADD COLUMN kind text NOT NULL DEFAULT 'SI' CHECK (kind IN ('SI', 'DP'));
ALTER TABLE sales_invoices ADD COLUMN dp_account text REFERENCES accounts (no);
CREATE TABLE sales_dp_usages (
  invoice_number text   NOT NULL REFERENCES sales_invoices (number),
  dp_number      text   NOT NULL REFERENCES sales_invoices (number),
  amount         bigint NOT NULL CHECK (amount > 0),
  PRIMARY KEY (invoice_number, dp_number)
);
