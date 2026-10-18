ALTER TABLE items ADD COLUMN delivered_account text REFERENCES accounts (no);
CREATE TABLE sales_orders (number text PRIMARY KEY, customer_no text NOT NULL REFERENCES customers (no), date date NOT NULL, description text NOT NULL DEFAULT '', total bigint NOT NULL);
CREATE TABLE sales_order_lines (order_number text NOT NULL REFERENCES sales_orders (number), seq integer NOT NULL, item_no text NOT NULL REFERENCES items (no),
  quantity numeric NOT NULL CHECK (quantity > 0), unit_price bigint NOT NULL, PRIMARY KEY (order_number, seq));
CREATE TABLE delivery_orders (number text PRIMARY KEY, customer_no text NOT NULL REFERENCES customers (no), order_number text REFERENCES sales_orders (number),
  date date NOT NULL, description text NOT NULL DEFAULT '', journal_id text NOT NULL);
CREATE TABLE delivery_order_lines (delivery_number text NOT NULL REFERENCES delivery_orders (number), seq integer NOT NULL, item_no text NOT NULL REFERENCES items (no),
  quantity numeric NOT NULL CHECK (quantity > 0), cost bigint NOT NULL, PRIMARY KEY (delivery_number, seq));
ALTER TABLE sales_invoices ADD COLUMN delivery_number text REFERENCES delivery_orders (number);
CREATE TRIGGER sales_orders_audit AFTER INSERT OR UPDATE OR DELETE ON sales_orders FOR EACH ROW EXECUTE FUNCTION audit_row('number');
CREATE TRIGGER delivery_orders_audit AFTER INSERT OR UPDATE OR DELETE ON delivery_orders FOR EACH ROW EXECUTE FUNCTION audit_row('number');
