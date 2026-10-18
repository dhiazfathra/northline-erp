ALTER TABLE journals ADD COLUMN source_type text NOT NULL DEFAULT 'JV';

-- Generic row history for master data and documents (ADR-0005).
CREATE TABLE audit_log (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name text NOT NULL,
  row_key    text NOT NULL,
  op         text NOT NULL,
  old_row    jsonb,
  new_row    jsonb,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION audit_row() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO audit_log (table_name, row_key, op, old_row, new_row)
  VALUES (TG_TABLE_NAME, COALESCE(to_jsonb(NEW), to_jsonb(OLD)) ->> TG_ARGV[0], TG_OP,
          CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END, CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TABLE customers (
  no         text PRIMARY KEY,
  name       text NOT NULL,
  ar_account text NOT NULL REFERENCES accounts (no)
);
CREATE TRIGGER customers_audit AFTER INSERT OR UPDATE OR DELETE ON customers FOR EACH ROW EXECUTE FUNCTION audit_row('no');

CREATE TABLE items (
  no            text PRIMARY KEY,
  name          text NOT NULL,
  type          text NOT NULL CHECK (type IN ('SERVICE', 'INVENTORY', 'NON_INVENTORY')),
  unit          text NOT NULL,
  sales_account text NOT NULL REFERENCES accounts (no)
);
CREATE TRIGGER items_audit AFTER INSERT OR UPDATE OR DELETE ON items FOR EACH ROW EXECUTE FUNCTION audit_row('no');

CREATE TABLE sales_invoices (
  number      text PRIMARY KEY,
  customer_no text NOT NULL REFERENCES customers (no),
  date        date NOT NULL,
  due_date    date NOT NULL,
  description text NOT NULL DEFAULT '',
  total       bigint NOT NULL CHECK (total > 0),
  journal_id  text NOT NULL
);
CREATE TABLE sales_invoice_lines (
  invoice_number text    NOT NULL REFERENCES sales_invoices (number),
  seq            integer NOT NULL,
  item_no        text    NOT NULL REFERENCES items (no),
  name           text    NOT NULL,
  quantity       numeric NOT NULL CHECK (quantity > 0),
  unit_price     bigint  NOT NULL,
  total          bigint  NOT NULL,
  PRIMARY KEY (invoice_number, seq)
);
CREATE TRIGGER sales_invoices_audit AFTER INSERT OR UPDATE OR DELETE ON sales_invoices FOR EACH ROW EXECUTE FUNCTION audit_row('number');

CREATE TABLE sales_receipts (
  number      text PRIMARY KEY,
  customer_no text NOT NULL REFERENCES customers (no),
  bank_no     text NOT NULL REFERENCES accounts (no),
  date        date NOT NULL,
  description text NOT NULL DEFAULT '',
  amount      bigint NOT NULL CHECK (amount > 0),
  journal_id  text NOT NULL
);
CREATE TABLE sales_receipt_lines (
  receipt_number text   NOT NULL REFERENCES sales_receipts (number),
  invoice_number text   NOT NULL REFERENCES sales_invoices (number),
  amount         bigint NOT NULL CHECK (amount > 0),
  PRIMARY KEY (receipt_number, invoice_number)
);
CREATE TRIGGER sales_receipts_audit AFTER INSERT OR UPDATE OR DELETE ON sales_receipts FOR EACH ROW EXECUTE FUNCTION audit_row('number');
