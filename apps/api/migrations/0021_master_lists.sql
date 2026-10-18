CREATE TABLE currencies (code text PRIMARY KEY, name text NOT NULL, symbol text NOT NULL, converter text NOT NULL DEFAULT 'FOREIGN_TO_LOCAL');
CREATE TABLE fobs (name text PRIMARY KEY, seq integer NOT NULL);
CREATE TABLE taxes (name text PRIMARY KEY, rate numeric NOT NULL, seq integer NOT NULL);
CREATE TABLE shipments (name text PRIMARY KEY, street text NOT NULL DEFAULT '');
-- Kategori aset tetap pajak: group + method; the rate is derived from the life (Indonesian PPh 17 schedule).
CREATE TABLE fiscal_fa_types (name text PRIMARY KEY, life_years integer NOT NULL, method text NOT NULL CHECK (method IN ('STRAIGHTLINE', 'DECLINING', 'NONE')), seq integer NOT NULL);
ALTER TABLE employees ADD COLUMN position text NOT NULL DEFAULT '', ADD COLUMN mobile text NOT NULL DEFAULT '', ADD COLUMN phone text NOT NULL DEFAULT '', ADD COLUMN email text NOT NULL DEFAULT '', ADD COLUMN salesman boolean NOT NULL DEFAULT false;
CREATE TRIGGER currencies_audit AFTER INSERT OR UPDATE OR DELETE ON currencies FOR EACH ROW EXECUTE FUNCTION audit_row('code');
CREATE TRIGGER taxes_audit AFTER INSERT OR UPDATE OR DELETE ON taxes FOR EACH ROW EXECUTE FUNCTION audit_row('name');
