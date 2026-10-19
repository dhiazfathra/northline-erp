-- Perintah Pembayaran (TFO.yyyy.mm.nnnnn, P3.2; fixture docs/reports/fixtures/transfer-orders-m49.json): a payment order
-- sent to the bank for open purchase invoices. It posts nothing; the payment journal comes when the bank transfers.
CREATE TABLE transfer_orders (
  number         text PRIMARY KEY,
  date           date NOT NULL,
  due_date       date NOT NULL,
  bank_no        text NOT NULL REFERENCES accounts (no),
  payment_method text NOT NULL CHECK (payment_method IN ('BANK_TRANSFER', 'VIRTUAL_ACCOUNT', 'CHEQUE')),
  status         text NOT NULL DEFAULT 'WAITING' CHECK (status IN ('DRAFT', 'UNAPPROVED', 'REJECTED', 'WAITING', 'PARTIAL_TRANSFERRED', 'FULLY_TRANSFERRED', 'FAILED')),
  description    text NOT NULL DEFAULT ''
);
CREATE TABLE transfer_order_lines (
  order_number   text   NOT NULL REFERENCES transfer_orders (number),
  seq            int    NOT NULL,
  invoice_number text   NOT NULL REFERENCES purchase_invoices (number),
  amount         bigint NOT NULL CHECK (amount > 0),
  vendor_bank    text   NOT NULL DEFAULT '', -- the vendor's account, e.g. "BCA 1234567890"
  PRIMARY KEY (order_number, seq)
);
CREATE TRIGGER transfer_orders_audit AFTER INSERT OR UPDATE OR DELETE ON transfer_orders FOR EACH ROW EXECUTE FUNCTION audit_row('number');
