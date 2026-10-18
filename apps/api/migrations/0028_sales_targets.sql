-- Target Penjualan (docs/reports/ItemSalesTargetReport.md): per item / item category over a date range, or per month of
-- a year (GENERAL). Plain master data with audit history.
CREATE TABLE sales_targets (
  name      text PRIMARY KEY,
  kind      text NOT NULL CHECK (kind IN ('ITEM', 'CATEGORY', 'GENERAL')),
  year      integer NOT NULL,
  from_date date NOT NULL,
  to_date   date NOT NULL,
  analyst   text NOT NULL DEFAULT ''
);
CREATE TABLE sales_target_lines (
  target_name text NOT NULL REFERENCES sales_targets (name),
  seq         integer NOT NULL,
  item_no     text REFERENCES items (no),
  category    text,
  month       integer CHECK (month BETWEEN 1 AND 12),
  quantity    numeric NOT NULL DEFAULT 0,
  amount      bigint NOT NULL,
  PRIMARY KEY (target_name, seq)
);
CREATE TRIGGER sales_targets_audit AFTER INSERT OR UPDATE OR DELETE ON sales_targets FOR EACH ROW EXECUTE FUNCTION audit_row('name');
