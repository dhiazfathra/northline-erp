-- Purchase orders and goods receipts carry no journal value (Accurate posts the receipt at 0 until invoiced).
CREATE TABLE purchase_orders (
  number text PRIMARY KEY, vendor_no text NOT NULL REFERENCES vendors (no), date date NOT NULL,
  description text NOT NULL DEFAULT '', total bigint NOT NULL
);
CREATE TABLE purchase_order_lines (
  order_number text NOT NULL REFERENCES purchase_orders (number), seq integer NOT NULL,
  item_no text NOT NULL REFERENCES items (no), quantity numeric NOT NULL CHECK (quantity > 0), unit_price bigint NOT NULL, total bigint NOT NULL,
  PRIMARY KEY (order_number, seq)
);
CREATE TRIGGER purchase_orders_audit AFTER INSERT OR UPDATE OR DELETE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION audit_row('number');
CREATE TABLE receive_items (
  number text PRIMARY KEY, vendor_no text NOT NULL REFERENCES vendors (no), date date NOT NULL,
  receive_number text NOT NULL, description text NOT NULL DEFAULT ''
);
CREATE TABLE receive_item_lines (
  receive_number text NOT NULL REFERENCES receive_items (number), seq integer NOT NULL,
  item_no text NOT NULL REFERENCES items (no), quantity numeric NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (receive_number, seq)
);
CREATE TRIGGER receive_items_audit AFTER INSERT OR UPDATE OR DELETE ON receive_items FOR EACH ROW EXECUTE FUNCTION audit_row('number');
