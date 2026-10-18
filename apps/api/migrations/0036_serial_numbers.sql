-- Nomor seri (docs/reports/ReceivedDeliveredSerialNumberReport.md). One row per serial movement; quantity +1 in, -1 out.
CREATE TABLE serial_numbers (
  item_no text NOT NULL REFERENCES items(no),
  serial text NOT NULL,
  date date NOT NULL,
  doc_type text NOT NULL,
  doc_number text NOT NULL,
  quantity int NOT NULL,
  warehouse text NOT NULL,
  PRIMARY KEY (item_no, serial, doc_number)
);
