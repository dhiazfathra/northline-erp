-- PPh withholding (bukti potong) on receipts and payments (P3.5; fixture docs/reports/fixtures/pph-m50.json).
-- Accurate withholds PPh on the receipt/payment line, not the invoice: the line settles the whole invoice amount, the
-- bank moves amount − PPh and the PPh goes to the tax's sales (prepaid, receipts) or purchase (payable, payments) account.
ALTER TABLE taxes ADD COLUMN pph_type text; -- report group, e.g. 'Pajak Penghasilan Ps.23'; NULL for PPN
ALTER TABLE sales_receipt_lines ADD COLUMN pph_tax text REFERENCES taxes (name), ADD COLUMN pph_number text, ADD COLUMN pph_dpp bigint,
  ADD COLUMN pph_rate numeric, ADD COLUMN pph_amount bigint NOT NULL DEFAULT 0;
ALTER TABLE purchase_payment_lines ADD COLUMN pph_tax text REFERENCES taxes (name), ADD COLUMN pph_number text, ADD COLUMN pph_dpp bigint,
  ADD COLUMN pph_rate numeric, ADD COLUMN pph_amount bigint NOT NULL DEFAULT 0;
