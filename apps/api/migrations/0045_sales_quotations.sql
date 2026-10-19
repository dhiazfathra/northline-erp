-- Penawaran Penjualan (ADR-0027): no journal. Order lines may come from a quotation line, invoice lines from an order line;
-- the linked quantities are what the reports print as processed (Kts Terproses / status).
CREATE TABLE sales_quotations (number text PRIMARY KEY, customer_no text NOT NULL REFERENCES customers (no), date date NOT NULL, description text NOT NULL DEFAULT '', total bigint NOT NULL);
CREATE TABLE sales_quotation_lines (quotation_number text NOT NULL REFERENCES sales_quotations (number), seq integer NOT NULL, item_no text NOT NULL REFERENCES items (no),
  quantity numeric NOT NULL CHECK (quantity > 0), unit_price bigint NOT NULL, PRIMARY KEY (quotation_number, seq));
ALTER TABLE sales_order_lines ADD COLUMN quotation_number text, ADD COLUMN quotation_seq integer,
  ADD FOREIGN KEY (quotation_number, quotation_seq) REFERENCES sales_quotation_lines (quotation_number, seq);
ALTER TABLE sales_invoice_lines ADD COLUMN order_number text, ADD COLUMN order_seq integer,
  ADD FOREIGN KEY (order_number, order_seq) REFERENCES sales_order_lines (order_number, seq);
CREATE TRIGGER sales_quotations_audit AFTER INSERT OR UPDATE OR DELETE ON sales_quotations FOR EACH ROW EXECUTE FUNCTION audit_row('number');
