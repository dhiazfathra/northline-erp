ALTER TABLE items ADD COLUMN expense_account text REFERENCES accounts (no);

CREATE TABLE vendors (
  no         text PRIMARY KEY,
  name       text NOT NULL,
  ap_account text NOT NULL REFERENCES accounts (no)
);
CREATE TRIGGER vendors_audit AFTER INSERT OR UPDATE OR DELETE ON vendors FOR EACH ROW EXECUTE FUNCTION audit_row('no');

CREATE TABLE purchase_invoices (
  number      text PRIMARY KEY,
  vendor_no   text NOT NULL REFERENCES vendors (no),
  bill_number text NOT NULL,
  date        date NOT NULL,
  due_date    date NOT NULL,
  description text NOT NULL DEFAULT '',
  total       bigint NOT NULL CHECK (total > 0),
  journal_id  text NOT NULL,
  UNIQUE (vendor_no, bill_number)
);
CREATE TABLE purchase_invoice_lines (
  invoice_number text    NOT NULL REFERENCES purchase_invoices (number),
  seq            integer NOT NULL,
  item_no        text    NOT NULL REFERENCES items (no),
  quantity       numeric NOT NULL CHECK (quantity > 0),
  unit_price     bigint  NOT NULL,
  total          bigint  NOT NULL,
  PRIMARY KEY (invoice_number, seq)
);
CREATE TRIGGER purchase_invoices_audit AFTER INSERT OR UPDATE OR DELETE ON purchase_invoices FOR EACH ROW EXECUTE FUNCTION audit_row('number');

CREATE TABLE purchase_payments (
  number      text PRIMARY KEY,
  vendor_no   text NOT NULL REFERENCES vendors (no),
  bank_no     text NOT NULL REFERENCES accounts (no),
  date        date NOT NULL,
  description text NOT NULL DEFAULT '',
  amount      bigint NOT NULL CHECK (amount > 0),
  journal_id  text NOT NULL
);
CREATE TABLE purchase_payment_lines (
  payment_number text   NOT NULL REFERENCES purchase_payments (number),
  invoice_number text   NOT NULL REFERENCES purchase_invoices (number),
  amount         bigint NOT NULL CHECK (amount > 0),
  PRIMARY KEY (payment_number, invoice_number)
);
CREATE TRIGGER purchase_payments_audit AFTER INSERT OR UPDATE OR DELETE ON purchase_payments FOR EACH ROW EXECUTE FUNCTION audit_row('number');
