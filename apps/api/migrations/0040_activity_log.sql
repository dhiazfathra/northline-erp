-- Log Aktifitas (ADR-0019): one row per saved create/edit/delete, written in the same transaction as the change.
-- Reference and document date are snapshots taken when the row is written; later edits never rewrite history.
CREATE TABLE activity_log (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  logged_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  user_id   bigint REFERENCES users (id),
  client_ip text,
  action    text NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  entity    text NOT NULL,
  reference text NOT NULL,
  doc_date  date
);
CREATE INDEX activity_log_newest ON activity_log (logged_at DESC, id DESC);

CREATE FUNCTION activity_log_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'activity_log is append-only (% blocked)', TG_OP;
END $$;
CREATE TRIGGER activity_log_no_update BEFORE UPDATE OR DELETE ON activity_log FOR EACH ROW EXECUTE FUNCTION activity_log_append_only();
CREATE TRIGGER activity_log_no_truncate BEFORE TRUNCATE ON activity_log FOR EACH STATEMENT EXECUTE FUNCTION activity_log_append_only();

-- Pengguna column: the user's display name (Accurate prints the login name next to the email).
ALTER TABLE users ADD COLUMN name text;
