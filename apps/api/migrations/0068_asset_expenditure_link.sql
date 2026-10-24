-- An asset expense row picked from a Pengeluaran Aset keeps that document's number apart from its credit account,
-- so the form does not offer it again; unique so one expenditure is capitalised into one asset row only.
ALTER TABLE fixed_asset_expenditures ADD COLUMN expenditure_number text REFERENCES asset_expenditures (number);
CREATE UNIQUE INDEX fixed_asset_expenditures_expenditure_number ON fixed_asset_expenditures (expenditure_number);
