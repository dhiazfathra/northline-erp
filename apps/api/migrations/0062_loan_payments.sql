-- Pelunasan Pinjaman and Pembayaran Angsuran (P4.2 batch 5, docs/parity/kas-bank): payments against a disbursed loan
-- (Dr the bank / Cr the loan's Piutang Karyawan, ELS./ELI.yyyy.mm.nnnnn). A loan with a payment total below its amount is unpaid.
CREATE TABLE employee_loan_payments (number text PRIMARY KEY, loan_number text NOT NULL REFERENCES employee_loans (number),
  kind text NOT NULL CHECK (kind IN ('INSTALLMENT', 'SETTLEMENT')), bank_no text NOT NULL REFERENCES accounts (no), date date NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0), description text NOT NULL DEFAULT '', journal_id text NOT NULL);
CREATE TRIGGER employee_loan_payments_audit AFTER INSERT OR UPDATE OR DELETE ON employee_loan_payments FOR EACH ROW EXECUTE FUNCTION audit_row('number');
ALTER TABLE employee_loans ADD COLUMN penalty_account text REFERENCES accounts (no);
