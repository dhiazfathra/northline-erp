-- Retail Demo inventory reports (ADR-0024, docs/reports/fixtures/retail/inventory-re.json).
-- Batch/production numbers carry any quantity and an optional expiry date. A transfer writes two rows per serial
-- (out of one warehouse, into the other or transit), so the warehouse joins the key; id keeps entry order.
ALTER TABLE serial_numbers ADD COLUMN expiry date, ADD COLUMN id bigint GENERATED ALWAYS AS IDENTITY;
ALTER TABLE serial_numbers DROP CONSTRAINT serial_numbers_pkey, ADD PRIMARY KEY (item_no, serial, doc_number, warehouse);

-- Pemindahan Barang lines; a receipt (IN) names the send (OUT) it answers.
ALTER TABLE item_transfers ADD COLUMN from_number text REFERENCES item_transfers (number);
CREATE TABLE item_transfer_lines (
  transfer_number text    NOT NULL REFERENCES item_transfers (number),
  seq             int     NOT NULL,
  item_no         text    NOT NULL REFERENCES items (no),
  quantity        numeric NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (transfer_number, seq)
);

-- Gudang master (Daftar Gudang). Stock rows keep naming warehouses by text, as before.
CREATE TABLE warehouses (
  name text PRIMARY KEY, description text NOT NULL DEFAULT '', street text NOT NULL DEFAULT '', city text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '', zip_code text NOT NULL DEFAULT '', country text NOT NULL DEFAULT ''
);
CREATE TRIGGER warehouses_audit AFTER INSERT OR UPDATE OR DELETE ON warehouses FOR EACH ROW EXECUTE FUNCTION audit_row('name');

-- Harga Pemasok: optional Tanggal Berakhir.
ALTER TABLE vendor_prices ADD COLUMN end_date date;
