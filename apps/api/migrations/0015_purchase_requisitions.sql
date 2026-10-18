CREATE TABLE purchase_requisitions (number text PRIMARY KEY, date date NOT NULL, description text NOT NULL DEFAULT '');
CREATE TABLE purchase_requisition_lines (
  requisition_number text NOT NULL REFERENCES purchase_requisitions (number), seq integer NOT NULL,
  item_no text NOT NULL REFERENCES items (no), quantity numeric NOT NULL CHECK (quantity > 0), required_date date,
  PRIMARY KEY (requisition_number, seq)
);
CREATE TRIGGER purchase_requisitions_audit AFTER INSERT OR UPDATE OR DELETE ON purchase_requisitions FOR EACH ROW EXECUTE FUNCTION audit_row('number');
