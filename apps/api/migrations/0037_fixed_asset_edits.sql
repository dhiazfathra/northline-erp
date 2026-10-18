-- Perubahan Aset Tetap (docs/reports/FixedAssetEditedListReport.md): data changes without a journal.
CREATE TABLE fixed_asset_edits (
  number text PRIMARY KEY,
  asset_number text NOT NULL REFERENCES fixed_assets(number),
  date date NOT NULL,
  description text NOT NULL DEFAULT '',
  old_life_months int NOT NULL,
  new_life_months int NOT NULL
);
