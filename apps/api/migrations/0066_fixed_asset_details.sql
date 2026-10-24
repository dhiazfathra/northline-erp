-- Aset Tetap form fields the API used to drop (ADR-0049, N1). Salvage in cents; depreciation runs on cost - salvage.
-- Location names a branch so Aset per Lokasi can group by it; plain text, the form may predate the branch row.
ALTER TABLE fixed_assets ADD COLUMN location text NOT NULL DEFAULT '', ADD COLUMN department text NOT NULL DEFAULT '', ADD COLUMN note text NOT NULL DEFAULT '',
  ADD COLUMN tax boolean NOT NULL DEFAULT false, ADD COLUMN qty integer NOT NULL DEFAULT 1 CHECK (qty > 0), ADD COLUMN salvage bigint NOT NULL DEFAULT 0 CHECK (salvage >= 0);
ALTER TABLE branches ADD COLUMN address text NOT NULL DEFAULT '';

-- Pengeluaran Aset: a draft document only; it posts no journal (no existing flow capitalises it yet).
CREATE TABLE asset_expenditures (
  number      text PRIMARY KEY,
  date        date NOT NULL,
  description text NOT NULL,
  asset_code  text NOT NULL DEFAULT '',
  note        text NOT NULL DEFAULT '',
  qty         integer NOT NULL,
  dpp         bigint NOT NULL CHECK (dpp >= 0),
  total       bigint NOT NULL CHECK (total >= 0),
  status      text NOT NULL DEFAULT 'Draf' CHECK (status IN ('Draf', 'Disetujui')),
  branch      text NOT NULL REFERENCES branches (name)
);
CREATE TABLE asset_expenditure_lines (
  expenditure_number text    NOT NULL REFERENCES asset_expenditures (number) ON DELETE CASCADE,
  seq                integer NOT NULL,
  asset_number       text    NOT NULL REFERENCES fixed_assets (number),
  qty                integer NOT NULL CHECK (qty > 0),
  note               text    NOT NULL DEFAULT '',
  PRIMARY KEY (expenditure_number, seq)
);
CREATE TRIGGER asset_expenditures_audit AFTER INSERT OR UPDATE OR DELETE ON asset_expenditures FOR EACH ROW EXECUTE FUNCTION audit_row('number');
