-- Giro mundur (docs/reports/OutstandingChequeReport.md): receipts paid by cheque/giro carry its number and due date.
ALTER TABLE sales_receipts ADD COLUMN payment_method text NOT NULL DEFAULT 'CASH_OTHER', ADD COLUMN cheque_no text, ADD COLUMN cheque_date date;
