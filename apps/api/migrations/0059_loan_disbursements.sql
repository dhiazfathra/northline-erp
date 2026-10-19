-- Pencairan Pinjaman (P4.2, docs/parity/kas-bank/pencairan-pinjaman): a loan's Piutang Karyawan account, and the
-- disbursement that pays the loan out of a cash/bank account (Dr the loan's receivable / Cr the bank, ELD.yyyy.mm.nnnnn).
ALTER TABLE employee_loans ADD COLUMN receivable_account text REFERENCES accounts (no);
CREATE TABLE employee_loan_disbursements (number text PRIMARY KEY, loan_number text NOT NULL REFERENCES employee_loans (number),
  bank_no text NOT NULL REFERENCES accounts (no), date date NOT NULL, amount bigint NOT NULL CHECK (amount > 0),
  description text NOT NULL DEFAULT '', journal_id text NOT NULL);
CREATE TRIGGER employee_loan_disbursements_audit AFTER INSERT OR UPDATE OR DELETE ON employee_loan_disbursements FOR EACH ROW EXECUTE FUNCTION audit_row('number');
