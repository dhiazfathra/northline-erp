CREATE TABLE employees (no text PRIMARY KEY, name text NOT NULL);
CREATE TRIGGER employees_audit AFTER INSERT OR UPDATE OR DELETE ON employees FOR EACH ROW EXECUTE FUNCTION audit_row('no');
CREATE TABLE employee_loans (number text PRIMARY KEY, employee_no text NOT NULL REFERENCES employees (no), date date NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0), interest_rate numeric NOT NULL DEFAULT 0, description text NOT NULL DEFAULT '');
CREATE TRIGGER employee_loans_audit AFTER INSERT OR UPDATE OR DELETE ON employee_loans FOR EACH ROW EXECUTE FUNCTION audit_row('number');
