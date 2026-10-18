-- Pembayaran / Penerimaan (other payments and deposits) on a cash/bank account.
CREATE TABLE cash_documents (number text PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('PAY', 'DEP')), bank_no text NOT NULL REFERENCES accounts (no),
  date date NOT NULL, cheque_no text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '', amount bigint NOT NULL CHECK (amount > 0), journal_id text NOT NULL);
CREATE TABLE cash_document_lines (document_number text NOT NULL REFERENCES cash_documents (number), seq integer NOT NULL,
  account_no text NOT NULL REFERENCES accounts (no), amount bigint NOT NULL CHECK (amount > 0), notes text NOT NULL DEFAULT '', PRIMARY KEY (document_number, seq));
CREATE TRIGGER cash_documents_audit AFTER INSERT OR UPDATE OR DELETE ON cash_documents FOR EACH ROW EXECUTE FUNCTION audit_row('number');
