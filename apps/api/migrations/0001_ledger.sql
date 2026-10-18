-- Write side: append-only event store (ADR-0001).
CREATE TABLE events (
  global_position bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  stream_id       text        NOT NULL,
  stream_version  integer     NOT NULL,
  event_type      text        NOT NULL,
  event_version   integer     NOT NULL DEFAULT 1,
  payload         jsonb       NOT NULL,
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stream_id, stream_version)
);

CREATE FUNCTION events_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'events is append-only (% blocked)', TG_OP;
END $$;
CREATE TRIGGER events_no_update BEFORE UPDATE OR DELETE ON events FOR EACH ROW EXECUTE FUNCTION events_append_only();
CREATE TRIGGER events_no_truncate BEFORE TRUNCATE ON events FOR EACH STATEMENT EXECUTE FUNCTION events_append_only();

CREATE TABLE snapshots (
  stream_id      text PRIMARY KEY,
  stream_version integer NOT NULL,
  state          jsonb   NOT NULL
);

-- Commands are idempotent per key: the stored result is returned on replay.
CREATE TABLE command_results (
  idempotency_key text PRIMARY KEY,
  command_type    text  NOT NULL,
  result          jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Transactional outbox, written in the same transaction as the events; relayed to pg-boss.
CREATE TABLE outbox (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  global_position bigint NOT NULL REFERENCES events (global_position),
  topic           text   NOT NULL,
  payload         jsonb  NOT NULL,
  relayed_at      timestamptz
);
CREATE INDEX outbox_pending ON outbox (id) WHERE relayed_at IS NULL;

-- Read side.
CREATE TABLE projection_checkpoints (
  projection      text PRIMARY KEY,
  global_position bigint NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Master data: plain tables with audit history (not event-sourced yet).
CREATE TABLE accounts (
  no         text PRIMARY KEY,
  name       text NOT NULL,
  type       text NOT NULL,
  parent_no  text REFERENCES accounts (no),
  suspended  boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE accounts_audit (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_no text NOT NULL,
  op         text NOT NULL,
  old_row    jsonb,
  new_row    jsonb,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION accounts_audit_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO accounts_audit (account_no, op, old_row, new_row)
  VALUES (COALESCE(NEW.no, OLD.no), TG_OP,
          CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER accounts_audit AFTER INSERT OR UPDATE OR DELETE ON accounts FOR EACH ROW EXECUTE FUNCTION accounts_audit_fn();

CREATE TABLE ledger_settings (
  id                        boolean PRIMARY KEY DEFAULT true CHECK (id),
  retained_earnings_account text    NOT NULL REFERENCES accounts (no),
  fiscal_year_start_month   integer NOT NULL DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12)
);

CREATE TABLE journals (
  journal_id   text PRIMARY KEY,
  number       text,
  date         date NOT NULL,
  description  text NOT NULL,
  reverses     text,
  reversed_by  text,
  global_position bigint NOT NULL
);

CREATE TABLE journal_lines (
  journal_id text    NOT NULL REFERENCES journals (journal_id),
  line_no    integer NOT NULL,
  date       date    NOT NULL,
  account_no text    NOT NULL REFERENCES accounts (no),
  debit      bigint  NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit     bigint  NOT NULL DEFAULT 0 CHECK (credit >= 0),
  memo       text,
  PRIMARY KEY (journal_id, line_no),
  CHECK ((debit = 0) <> (credit = 0))
);
CREATE INDEX journal_lines_account_date ON journal_lines (account_no, date);

-- Second line of defence for debits = credits, checked at commit (domain checks first).
CREATE FUNCTION journal_lines_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE diff bigint;
BEGIN
  SELECT COALESCE(SUM(debit - credit), 0) INTO diff FROM journal_lines WHERE journal_id = NEW.journal_id;
  IF diff <> 0 THEN
    RAISE EXCEPTION 'journal % unbalanced by %', NEW.journal_id, diff;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER journal_lines_balanced AFTER INSERT OR UPDATE ON journal_lines
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION journal_lines_balanced();

CREATE TABLE account_daily_balances (
  account_no text   NOT NULL REFERENCES accounts (no),
  date       date   NOT NULL,
  debit      bigint NOT NULL DEFAULT 0,
  credit     bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (account_no, date)
);

CREATE TABLE period_summaries (
  period    text PRIMARY KEY,
  debit     bigint  NOT NULL DEFAULT 0,
  credit    bigint  NOT NULL DEFAULT 0,
  journals  integer NOT NULL DEFAULT 0,
  closed    boolean NOT NULL DEFAULT false
);
