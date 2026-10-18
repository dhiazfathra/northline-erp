ALTER TABLE purchase_invoices ADD COLUMN kind text NOT NULL DEFAULT 'PI' CHECK (kind IN ('PI', 'DP'));
ALTER TABLE purchase_invoices ADD COLUMN dp_account text REFERENCES accounts (no);
CREATE TABLE purchase_dp_usages (
  invoice_number text   NOT NULL REFERENCES purchase_invoices (number),
  dp_number      text   NOT NULL REFERENCES purchase_invoices (number),
  amount         bigint NOT NULL CHECK (amount > 0),
  PRIMARY KEY (invoice_number, dp_number)
);
