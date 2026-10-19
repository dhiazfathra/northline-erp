-- Anggaran (ADR-0025, docs/reports/ProfitLossCompareBudgetReport.md): one budget per month and scope, as in Accurate's
-- Anggaran form. department NULL = scope Umum (general); otherwise scope Per Departemen. Amounts in cents, natural side.
CREATE TABLE budgets (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  year       integer NOT NULL,
  month      integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  department text REFERENCES departments (name),
  notes      text NOT NULL DEFAULT '',
  UNIQUE NULLS NOT DISTINCT (year, month, department)
);
CREATE TABLE budget_lines (
  budget_id  bigint NOT NULL REFERENCES budgets (id) ON DELETE CASCADE,
  account_no text NOT NULL REFERENCES accounts (no),
  amount     bigint NOT NULL,
  PRIMARY KEY (budget_id, account_no)
);
CREATE TRIGGER budgets_audit AFTER INSERT OR UPDATE OR DELETE ON budgets FOR EACH ROW EXECUTE FUNCTION audit_row('id');
