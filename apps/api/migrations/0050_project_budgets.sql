-- Kontraktor Demo (ADR-0035): Daftar Proyek prints a Keterangan, and Anggaran has a third scope Per Proyek.
-- A budget is Umum (both NULL), Per Departemen or Per Proyek, never both.
ALTER TABLE projects ADD COLUMN description text NOT NULL DEFAULT '';
ALTER TABLE budgets ADD COLUMN project text REFERENCES projects (name);
ALTER TABLE budgets ADD CHECK (department IS NULL OR project IS NULL);
ALTER TABLE budgets DROP CONSTRAINT budgets_year_month_department_key;
ALTER TABLE budgets ADD UNIQUE NULLS NOT DISTINCT (year, month, department, project);
