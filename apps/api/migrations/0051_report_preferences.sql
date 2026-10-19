-- ADR-0037: per-company report preferences. Trade Portal and Kontraktor age from the invoice date (ADR-0029 finding 7,
-- ADR-0035 finding 7); Kontraktor prints the standard P&L layout (ADR-0035 finding 2).
ALTER TABLE ledger_settings ADD COLUMN aging_basis text NOT NULL DEFAULT 'DUE_DATE' CHECK (aging_basis IN ('DUE_DATE', 'INVOICE_DATE'));
ALTER TABLE ledger_settings ADD COLUMN report_style text NOT NULL DEFAULT 'RETAIL' CHECK (report_style IN ('RETAIL', 'STANDARD'));
