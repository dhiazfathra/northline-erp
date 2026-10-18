-- Harga Pemasok (docs/reports/VendorPriceHistoryReport.md).
CREATE TABLE vendor_prices (
  number text NOT NULL,
  vendor_no text NOT NULL REFERENCES vendors(no),
  date date NOT NULL,
  item_no text NOT NULL REFERENCES items(no),
  price bigint NOT NULL,
  PRIMARY KEY (number, item_no)
);
