CREATE TABLE fixed_assets (
  number              text PRIMARY KEY,
  description         text NOT NULL,
  category            text NOT NULL,
  date                date NOT NULL,
  usage_date          date NOT NULL,
  life_months         integer NOT NULL CHECK (life_months > 0),
  method              text NOT NULL CHECK (method = 'STRAIGHTLINE'),
  asset_account       text NOT NULL REFERENCES accounts (no),
  accumulated_account text NOT NULL REFERENCES accounts (no),
  expense_account     text NOT NULL REFERENCES accounts (no),
  cost                bigint NOT NULL CHECK (cost > 0),
  journal_id          text NOT NULL
);
CREATE TRIGGER fixed_assets_audit AFTER INSERT OR UPDATE OR DELETE ON fixed_assets FOR EACH ROW EXECUTE FUNCTION audit_row('number');
CREATE TABLE fixed_asset_expenditures (
  asset_number text    NOT NULL REFERENCES fixed_assets (number),
  seq          integer NOT NULL,
  name         text    NOT NULL,
  date         date    NOT NULL,
  amount       bigint  NOT NULL CHECK (amount > 0),
  account      text    NOT NULL REFERENCES accounts (no),
  PRIMARY KEY (asset_number, seq)
);
-- Month-end process (Proses Akhir Bulan): one per month; per-asset depreciation records carry their own JV number.
CREATE TABLE period_ends (
  period     text PRIMARY KEY,
  number     text NOT NULL,
  date       date NOT NULL,
  journal_id text
);
CREATE TABLE depreciations (
  asset_number text   NOT NULL REFERENCES fixed_assets (number),
  period       text   NOT NULL REFERENCES period_ends (period),
  date         date   NOT NULL,
  jv_number    text   NOT NULL,
  amount       bigint NOT NULL CHECK (amount > 0),
  PRIMARY KEY (asset_number, period)
);
