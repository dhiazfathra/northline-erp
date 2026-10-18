-- Penyesuaian Harga/Diskon Jual (docs/reports/SellingPriceAdjustmentDetailReport.md): effective-dated selling prices and
-- discounts per price category. Plain documents with audit history (master-data side, ADR-0005).
CREATE TABLE selling_price_adjustments (
  number         text PRIMARY KEY,
  date           date NOT NULL,
  kind           text NOT NULL CHECK (kind IN ('PRICE', 'DISCOUNT')),
  price_category text NOT NULL DEFAULT 'Umum',
  description    text NOT NULL DEFAULT ''
);
CREATE TABLE selling_price_adjustment_lines (
  adjustment_number text NOT NULL REFERENCES selling_price_adjustments (number),
  seq               integer NOT NULL,
  item_no           text NOT NULL REFERENCES items (no),
  price             bigint,
  disc_pct          numeric,
  PRIMARY KEY (adjustment_number, seq)
);
CREATE TRIGGER selling_price_adjustments_audit AFTER INSERT OR UPDATE OR DELETE ON selling_price_adjustments FOR EACH ROW EXECUTE FUNCTION audit_row('number');
