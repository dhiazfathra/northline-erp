-- Branch, department and project dimensions (ADR-0022). Master rows are plain tables keyed by name;
-- a journal names its branch (NULL = the default branch), each line may name a department and a project.
CREATE TABLE branches (name text PRIMARY KEY, is_default boolean NOT NULL DEFAULT false);
CREATE UNIQUE INDEX branches_one_default ON branches (is_default) WHERE is_default;
INSERT INTO branches (name, is_default) VALUES ('Kantor Pusat', true);
CREATE TABLE departments (name text PRIMARY KEY, description text NOT NULL DEFAULT '');
CREATE TABLE projects (name text PRIMARY KEY, no text NOT NULL UNIQUE);
CREATE TRIGGER branches_audit AFTER INSERT OR UPDATE OR DELETE ON branches FOR EACH ROW EXECUTE FUNCTION audit_row('name');
CREATE TRIGGER departments_audit AFTER INSERT OR UPDATE OR DELETE ON departments FOR EACH ROW EXECUTE FUNCTION audit_row('name');
CREATE TRIGGER projects_audit AFTER INSERT OR UPDATE OR DELETE ON projects FOR EACH ROW EXECUTE FUNCTION audit_row('name');

ALTER TABLE journals ADD COLUMN branch text REFERENCES branches (name);
ALTER TABLE journal_lines ADD COLUMN department text REFERENCES departments (name), ADD COLUMN project text REFERENCES projects (name);
