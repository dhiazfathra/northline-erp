CREATE TABLE item_adjustments (
  number text PRIMARY KEY, date date NOT NULL, description text NOT NULL DEFAULT '',
  account text NOT NULL REFERENCES accounts (no), total bigint NOT NULL, journal_id text NOT NULL
);
CREATE TABLE item_adjustment_lines (
  adjustment_number text NOT NULL REFERENCES item_adjustments (number), seq integer NOT NULL,
  item_no text NOT NULL REFERENCES items (no), direction text NOT NULL CHECK (direction IN ('IN', 'OUT')),
  quantity numeric NOT NULL CHECK (quantity > 0), cost bigint NOT NULL,
  PRIMARY KEY (adjustment_number, seq)
);
CREATE TRIGGER item_adjustments_audit AFTER INSERT OR UPDATE OR DELETE ON item_adjustments FOR EACH ROW EXECUTE FUNCTION audit_row('number');
