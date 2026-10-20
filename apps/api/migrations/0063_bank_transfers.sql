-- Transfer Bank (P4.2 batch 5, docs/parity/kas-bank/transfer-bank): Dr the destination bank / Cr the source bank, BT.yyyy.mm.nnnnn.
CREATE TABLE bank_transfers (number text PRIMARY KEY, from_bank text NOT NULL REFERENCES accounts (no), to_bank text NOT NULL REFERENCES accounts (no),
  date date NOT NULL, amount bigint NOT NULL CHECK (amount > 0), description text NOT NULL DEFAULT '', journal_id text NOT NULL);
CREATE TRIGGER bank_transfers_audit AFTER INSERT OR UPDATE OR DELETE ON bank_transfers FOR EACH ROW EXECUTE FUNCTION audit_row('number');
