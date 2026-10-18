-- Foreign-currency sales (ADR-0012).
ALTER TABLE customers ADD COLUMN currency text NOT NULL DEFAULT 'IDR', ADD COLUMN realized_gain_account text REFERENCES accounts(no);
ALTER TABLE sales_invoices ADD COLUMN rate numeric NOT NULL DEFAULT 1;
ALTER TABLE sales_receipts ADD COLUMN rate numeric NOT NULL DEFAULT 1;
-- amount = receivable settled at the invoice rate; amount_at_receipt = the same payment at the receipt rate (IDR)
ALTER TABLE sales_receipt_lines ADD COLUMN amount_at_receipt bigint;
