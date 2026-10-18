-- Pekerjaan Pesanan (job costing, ADR-0026; fixture docs/reports/fixtures/retail/jobcosting-rg.json).
-- A job order issues materials (FIFO cost) and books expenses into a WIP account; Penyelesaian Pesanan (roll-over)
-- moves the job total into finished items by portion and closes the job.
CREATE TABLE job_orders (
  number      text PRIMARY KEY,
  date        date   NOT NULL,
  description text   NOT NULL DEFAULT '',
  wip_account text   NOT NULL REFERENCES accounts (no),
  total       bigint NOT NULL,
  journal_id  text   NOT NULL
);
CREATE TABLE job_order_lines (
  job_number text    NOT NULL REFERENCES job_orders (number),
  seq        int     NOT NULL,
  item_no    text    REFERENCES items (no),     -- material line
  account_no text    REFERENCES accounts (no),  -- expense line
  name       text    NOT NULL,
  quantity   numeric NOT NULL CHECK (quantity > 0),
  amount     bigint  NOT NULL,
  PRIMARY KEY (job_number, seq),
  CHECK ((item_no IS NULL) <> (account_no IS NULL))
);
CREATE TABLE roll_overs (
  number      text PRIMARY KEY,
  job_number  text NOT NULL UNIQUE REFERENCES job_orders (number),
  date        date NOT NULL,
  description text NOT NULL DEFAULT '',
  journal_id  text NOT NULL
);
CREATE TABLE roll_over_lines (
  roll_over_number text    NOT NULL REFERENCES roll_overs (number),
  seq              int     NOT NULL,
  item_no          text    NOT NULL REFERENCES items (no),
  quantity         numeric NOT NULL CHECK (quantity > 0),
  portion          numeric NOT NULL CHECK (portion > 0 AND portion <= 100),
  amount           bigint  NOT NULL,
  PRIMARY KEY (roll_over_number, seq)
);
CREATE TRIGGER job_orders_audit AFTER INSERT OR UPDATE OR DELETE ON job_orders FOR EACH ROW EXECUTE FUNCTION audit_row('number');
CREATE TRIGGER roll_overs_audit AFTER INSERT OR UPDATE OR DELETE ON roll_overs FOR EACH ROW EXECUTE FUNCTION audit_row('number');
