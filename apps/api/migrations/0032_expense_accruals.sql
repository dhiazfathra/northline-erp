-- Pencatatan Beban (docs/reports/ExpenseAccrualSummaryReport.md).
CREATE TABLE expense_accruals (
  number text PRIMARY KEY,
  date date NOT NULL,
  due_date date NOT NULL,
  description text NOT NULL DEFAULT '',
  payable_account text NOT NULL REFERENCES accounts(no),
  total bigint NOT NULL,
  journal_id uuid NOT NULL
);
CREATE TABLE expense_accrual_lines (
  accrual_number text NOT NULL REFERENCES expense_accruals(number),
  seq int NOT NULL,
  account_no text NOT NULL REFERENCES accounts(no),
  amount bigint NOT NULL,
  PRIMARY KEY (accrual_number, seq)
);
