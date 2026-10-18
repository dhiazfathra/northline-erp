CREATE TABLE fixed_asset_disposals (
  number text PRIMARY KEY, asset_number text NOT NULL UNIQUE REFERENCES fixed_assets (number), date date NOT NULL,
  description text NOT NULL DEFAULT '', gain_loss_account text NOT NULL REFERENCES accounts (no),
  sold boolean NOT NULL, price bigint NOT NULL DEFAULT 0, selling_account text REFERENCES accounts (no), journal_id text NOT NULL
);
CREATE TRIGGER fixed_asset_disposals_audit AFTER INSERT OR UPDATE OR DELETE ON fixed_asset_disposals FOR EACH ROW EXECUTE FUNCTION audit_row('number');
