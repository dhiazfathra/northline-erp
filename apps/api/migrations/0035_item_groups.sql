-- Barang Grup (docs/reports/ItemGroupDetailReport.md).
ALTER TABLE items DROP CONSTRAINT items_type_check;
ALTER TABLE items ADD CONSTRAINT items_type_check CHECK (type IN ('SERVICE', 'INVENTORY', 'NON_INVENTORY', 'GROUP'));
CREATE TABLE item_group_components (
  group_no text NOT NULL REFERENCES items(no),
  seq int NOT NULL,
  item_no text NOT NULL REFERENCES items(no),
  quantity numeric NOT NULL,
  PRIMARY KEY (group_no, seq)
);
