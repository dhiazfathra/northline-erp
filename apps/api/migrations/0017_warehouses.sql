ALTER TABLE stock_moves ADD COLUMN warehouse text NOT NULL DEFAULT 'Utama';
CREATE TABLE item_transfers (
  number text PRIMARY KEY, date date NOT NULL, direction text NOT NULL CHECK (direction IN ('OUT', 'IN')),
  warehouse text NOT NULL, reference_warehouse text NOT NULL, description text NOT NULL DEFAULT ''
);
CREATE TRIGGER item_transfers_audit AFTER INSERT OR UPDATE OR DELETE ON item_transfers FOR EACH ROW EXECUTE FUNCTION audit_row('number');
