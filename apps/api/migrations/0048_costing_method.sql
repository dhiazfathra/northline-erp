-- ADR-0031: per-company costing method; FIFO stays the default.
ALTER TABLE ledger_settings ADD COLUMN costing_method text NOT NULL DEFAULT 'FIFO' CHECK (costing_method IN ('FIFO', 'AVERAGE'));
