ALTER TABLE items ADD COLUMN sales_return_account text REFERENCES accounts (no);

CREATE TABLE sales_returns (
  number         text PRIMARY KEY,
  customer_no    text NOT NULL REFERENCES customers (no),
  invoice_number text NOT NULL REFERENCES sales_invoices (number),
  date           date NOT NULL,
  description    text NOT NULL DEFAULT '',
  total          bigint NOT NULL CHECK (total > 0),
  journal_id     text NOT NULL
);
CREATE TABLE sales_return_lines (
  return_number text    NOT NULL REFERENCES sales_returns (number),
  seq           integer NOT NULL,
  item_no       text    NOT NULL REFERENCES items (no),
  quantity      numeric NOT NULL CHECK (quantity > 0),
  unit_price    bigint  NOT NULL,
  total         bigint  NOT NULL,
  PRIMARY KEY (return_number, seq)
);
CREATE TRIGGER sales_returns_audit AFTER INSERT OR UPDATE OR DELETE ON sales_returns FOR EACH ROW EXECUTE FUNCTION audit_row('number');

CREATE TABLE purchase_returns (
  number         text PRIMARY KEY,
  vendor_no      text NOT NULL REFERENCES vendors (no),
  invoice_number text NOT NULL REFERENCES purchase_invoices (number),
  date           date NOT NULL,
  description    text NOT NULL DEFAULT '',
  total          bigint NOT NULL CHECK (total > 0),
  journal_id     text NOT NULL
);
CREATE TABLE purchase_return_lines (
  return_number text    NOT NULL REFERENCES purchase_returns (number),
  seq           integer NOT NULL,
  item_no       text    NOT NULL REFERENCES items (no),
  quantity      numeric NOT NULL CHECK (quantity > 0),
  unit_price    bigint  NOT NULL,
  total         bigint  NOT NULL,
  PRIMARY KEY (return_number, seq)
);
CREATE TRIGGER purchase_returns_audit AFTER INSERT OR UPDATE OR DELETE ON purchase_returns FOR EACH ROW EXECUTE FUNCTION audit_row('number');
