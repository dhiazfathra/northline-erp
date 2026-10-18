-- Month-end revaluation of foreign receivables (ADR-0012 follow-up).
ALTER TABLE customers ADD COLUMN unrealized_gain_account text REFERENCES accounts(no);
