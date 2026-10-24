-- ADR-0049 (N1): Preferensi screen state that had no store. features = feature id -> on; default_accounts = label -> account no.
ALTER TABLE ledger_settings ADD COLUMN features jsonb NOT NULL DEFAULT '{}';
ALTER TABLE ledger_settings ADD COLUMN default_accounts jsonb NOT NULL DEFAULT '{}';
