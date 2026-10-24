-- ADR-0049 (N1): per-user report favourites (Memorize) and saved report layouts, replacing the web app's in-memory mocks.
CREATE TABLE report_favourites (user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE, report_id text NOT NULL, PRIMARY KEY (user_id, report_id));
CREATE TABLE report_layouts (user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE, report_id text NOT NULL, layout jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, report_id));
