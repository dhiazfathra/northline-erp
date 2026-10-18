-- Rekonsiliasi Bank (docs/reports/BankReconcileBookToStatementReport.md): a statement line (rekening koran) matched to a
-- book entry. Manual reconciliation creates the statement line from the book entry, so both live in one row.
CREATE TABLE bank_reconciliations (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bank_no               text NOT NULL REFERENCES accounts (no),
  doc_number            text NOT NULL UNIQUE,
  statement_date        date NOT NULL,
  statement_description text NOT NULL DEFAULT '',
  reconciled_by         text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);
