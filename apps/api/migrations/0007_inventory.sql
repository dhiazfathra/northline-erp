ALTER TABLE items ADD COLUMN inventory_account text REFERENCES accounts (no);
ALTER TABLE items ADD COLUMN cogs_account text REFERENCES accounts (no);

-- One row per stock movement; value is the cost in cents (+ in, − out). FIFO layers are derived from these rows.
CREATE TABLE stock_moves (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_no     text    NOT NULL REFERENCES items (no),
  date        date    NOT NULL,
  doc_type    text    NOT NULL,
  doc_number  text    NOT NULL,
  description text    NOT NULL DEFAULT '',
  quantity    numeric NOT NULL CHECK (quantity <> 0),
  value       bigint  NOT NULL
);
CREATE INDEX stock_moves_item_date ON stock_moves (item_no, date, id);
