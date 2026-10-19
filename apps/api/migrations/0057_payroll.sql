-- Pencatatan Gaji (P3.6; fixture docs/reports/fixtures/payroll-m50.json): monthly payroll runs on top of employees.
-- Fee amounts are kept by Accurate fee name; income, paid and PPh 21 (signed: negative = Kelebihan Pajak) are computed on save.
ALTER TABLE employees ADD COLUMN tax_status text NOT NULL DEFAULT 'TK0' CHECK (tax_status ~ '^(TK|K)[0-3]$');
CREATE TABLE payroll_runs (number text PRIMARY KEY, date date NOT NULL, year int NOT NULL, month int NOT NULL CHECK (month BETWEEN 1 AND 12));
CREATE TABLE payroll_lines (run_number text NOT NULL REFERENCES payroll_runs (number), employee_no text NOT NULL REFERENCES employees (no),
  fees jsonb NOT NULL, income bigint NOT NULL, paid bigint NOT NULL, pph bigint NOT NULL, PRIMARY KEY (run_number, employee_no));
CREATE TRIGGER payroll_runs_audit AFTER INSERT OR UPDATE OR DELETE ON payroll_runs FOR EACH ROW EXECUTE FUNCTION audit_row('number');
