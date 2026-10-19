-- Pekerjaan Pesanan, P3.1 (fixture docs/reports/fixtures/jobcosting-m49.json): customer on the job order, Penambahan Bahan
-- Baku (material pick/return against an open job, MA.yyyy.mm.nnnnn) and Penyelesaian Pesanan to accounts (rollOverType ACCOUNT).
ALTER TABLE job_orders ADD COLUMN customer_no text REFERENCES customers (no);
CREATE TABLE material_adjustments (
  number      text PRIMARY KEY,
  job_number  text NOT NULL REFERENCES job_orders (number),
  type        text NOT NULL CHECK (type IN ('ITEM_PICK', 'ITEM_RETURN')),
  date        date NOT NULL,
  description text NOT NULL DEFAULT '',
  journal_id  text NOT NULL
);
CREATE TABLE material_adjustment_lines (
  adjustment_number text    NOT NULL REFERENCES material_adjustments (number),
  seq               int     NOT NULL,
  item_no           text    NOT NULL REFERENCES items (no),
  quantity          numeric NOT NULL CHECK (quantity > 0),
  amount            bigint  NOT NULL, -- cost, positive for both types
  PRIMARY KEY (adjustment_number, seq)
);
ALTER TABLE roll_overs ADD COLUMN type text NOT NULL DEFAULT 'ITEM' CHECK (type IN ('ITEM', 'ACCOUNT'));
ALTER TABLE roll_over_lines ALTER COLUMN item_no DROP NOT NULL;
ALTER TABLE roll_over_lines ADD COLUMN account_no text REFERENCES accounts (no);
ALTER TABLE roll_over_lines ADD COLUMN name text;
ALTER TABLE roll_over_lines ADD CHECK ((item_no IS NULL) <> (account_no IS NULL));
CREATE TRIGGER material_adjustments_audit AFTER INSERT OR UPDATE OR DELETE ON material_adjustments FOR EACH ROW EXECUTE FUNCTION audit_row('number');
