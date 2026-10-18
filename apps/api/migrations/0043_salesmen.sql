-- Tenaga Penjual (ADR-0023): salesman master, salesmen per invoice line (levels 1..5 in array order), commission rules,
-- per-salesman sales targets and check-ins (mobile app records, imported).
CREATE TABLE salesmen (
  no   text PRIMARY KEY,
  name text NOT NULL
);
ALTER TABLE sales_invoice_lines ADD COLUMN salesmen text[] NOT NULL DEFAULT '{}';
-- the invoice line a return line takes back (its salesmen follow it)
ALTER TABLE sales_return_lines ADD COLUMN invoice_seq integer;

CREATE TABLE salesman_commissions (
  name     text PRIMARY KEY,
  percent  numeric NOT NULL CHECK (percent > 0),
  -- salesman levels (Urutan 1..5) the rule pays
  levels   integer[] NOT NULL,
  -- NULL = every salesman
  salesmen text[]
);

ALTER TABLE sales_targets DROP CONSTRAINT sales_targets_kind_check;
ALTER TABLE sales_targets ADD CONSTRAINT sales_targets_kind_check CHECK (kind IN ('ITEM', 'CATEGORY', 'GENERAL', 'SALESMAN'));
ALTER TABLE sales_target_lines ADD COLUMN salesman_no text REFERENCES salesmen (no);

CREATE TABLE sales_check_ins (
  id             serial PRIMARY KEY,
  date           date NOT NULL,
  salesman_no    text NOT NULL REFERENCES salesmen (no),
  address        text NOT NULL DEFAULT '',
  customer_name  text NOT NULL DEFAULT '',
  phone          text NOT NULL DEFAULT '',
  contact        text NOT NULL DEFAULT '',
  transaction_no text NOT NULL DEFAULT ''
);
