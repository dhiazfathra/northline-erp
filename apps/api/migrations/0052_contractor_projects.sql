-- Contractor Projects (ADR-0038). Separate from the plain Proyek dimension: Accurate splits them in its reports.
-- RAB totals are derived from lines, buffer % and fee %, never stored.
CREATE TABLE contractor_projects (
  no            text PRIMARY KEY,
  name          text NOT NULL,
  customer_no   text REFERENCES customers (no),
  manager       text NOT NULL DEFAULT '',
  target_start  date NOT NULL,
  finish_date   date,
  description   text NOT NULL DEFAULT '',
  warehouse     text REFERENCES warehouses (name),
  wip_account   text NOT NULL REFERENCES accounts (no),
  cogs_account  text NOT NULL REFERENCES accounts (no),
  income_account text NOT NULL REFERENCES accounts (no)
);
CREATE TABLE rabs (
  number  text PRIMARY KEY,
  project text NOT NULL REFERENCES contractor_projects (no),
  date    date NOT NULL,
  fee_pct numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT ''
);
CREATE TABLE rab_tasks (
  id          serial PRIMARY KEY,
  rab         text NOT NULL REFERENCES rabs (number),
  group_no    text NOT NULL,          -- I, II, III
  group_name  text NOT NULL,
  seq         int  NOT NULL,
  name        text NOT NULL,
  volume      numeric NOT NULL,
  unit        text NOT NULL DEFAULT '',
  unit_cost   bigint NOT NULL,
  buffer_pct  numeric NOT NULL DEFAULT 0,
  unit_price  bigint NOT NULL,
  start_date  date,                   -- planned schedule: Rencana % of Progres Proyek
  end_date    date,
  UNIQUE (rab, name)
);
CREATE TABLE rab_resources (
  id         serial PRIMARY KEY,
  task_id    int  NOT NULL REFERENCES rab_tasks (id),
  seq        int  NOT NULL,
  item_no    text REFERENCES items (no),
  account_no text REFERENCES accounts (no),
  name       text NOT NULL,
  unit       text NOT NULL DEFAULT '',
  quantity   numeric NOT NULL,
  unit_cost  bigint NOT NULL,
  CHECK ((item_no IS NULL) <> (account_no IS NULL))
);
-- Project-linked journal lines: purchase/sales/cash documents name the contractor project and, for actual cost, the
-- RAB resource it realises (Anggaran & Realisasi).
ALTER TABLE journal_lines ADD COLUMN contractor_project text REFERENCES contractor_projects (no),
  ADD COLUMN rab_resource int REFERENCES rab_resources (id);
CREATE TABLE material_usages (
  number      text PRIMARY KEY,
  project     text NOT NULL REFERENCES contractor_projects (no),
  date        date NOT NULL,
  description text NOT NULL DEFAULT '',
  journal_id  text NOT NULL
);
CREATE TABLE material_usage_lines (
  usage_number text NOT NULL REFERENCES material_usages (number),
  seq          int  NOT NULL,
  task_id      int  NOT NULL REFERENCES rab_tasks (id),
  resource_id  int  REFERENCES rab_resources (id),
  item_no      text NOT NULL REFERENCES items (no),
  quantity     numeric NOT NULL CHECK (quantity > 0),
  unit         text NOT NULL DEFAULT '',
  warehouse    text NOT NULL DEFAULT '',
  amount       bigint NOT NULL,
  PRIMARY KEY (usage_number, seq)
);
CREATE TABLE project_billings (
  invoice   text NOT NULL,
  project   text NOT NULL REFERENCES contractor_projects (no),
  group_no  text NOT NULL,
  share_pct numeric NOT NULL CHECK (share_pct > 0 AND share_pct <= 100),
  date      date NOT NULL,
  PRIMARY KEY (invoice, group_no)
);
-- Actual cost a purchase invoice / payment line books to the project (Realisasi of Anggaran & Realisasi): against a RAB
-- resource, or out of budget (resource NULL, Rincian Biaya).
CREATE TABLE project_costs (
  doc_number  text NOT NULL,
  seq         int  NOT NULL,
  project     text NOT NULL REFERENCES contractor_projects (no),
  date        date NOT NULL,
  resource_id int  REFERENCES rab_resources (id),
  name        text NOT NULL,
  quantity    numeric NOT NULL,
  amount      bigint NOT NULL,
  PRIMARY KEY (doc_number, seq)
);
CREATE TABLE project_completions (
  number     text PRIMARY KEY,
  project    text NOT NULL UNIQUE REFERENCES contractor_projects (no),
  date       date NOT NULL,
  journal_id text NOT NULL
);
CREATE TABLE project_completion_returns (
  completion text NOT NULL REFERENCES project_completions (number),
  seq        int  NOT NULL,
  item_no    text NOT NULL REFERENCES items (no),
  quantity   numeric NOT NULL CHECK (quantity > 0),
  unit       text NOT NULL DEFAULT '',
  warehouse  text NOT NULL DEFAULT '',
  amount     bigint NOT NULL,
  PRIMARY KEY (completion, seq)
);
CREATE TABLE surveys (
  number      text PRIMARY KEY,
  project     text NOT NULL REFERENCES contractor_projects (no),
  date        date NOT NULL,
  surveyor    text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT ''
);
CREATE TABLE survey_lines (
  survey_number text NOT NULL REFERENCES surveys (number),
  task_id       int  NOT NULL REFERENCES rab_tasks (id),
  progress_qty  numeric NOT NULL,
  portion_pct   numeric NOT NULL,
  PRIMARY KEY (survey_number, task_id)
);
CREATE TRIGGER contractor_projects_audit AFTER INSERT OR UPDATE OR DELETE ON contractor_projects FOR EACH ROW EXECUTE FUNCTION audit_row('no');
CREATE TRIGGER rabs_audit AFTER INSERT OR UPDATE OR DELETE ON rabs FOR EACH ROW EXECUTE FUNCTION audit_row('number');
CREATE TRIGGER material_usages_audit AFTER INSERT OR UPDATE OR DELETE ON material_usages FOR EACH ROW EXECUTE FUNCTION audit_row('number');
CREATE TRIGGER project_completions_audit AFTER INSERT OR UPDATE OR DELETE ON project_completions FOR EACH ROW EXECUTE FUNCTION audit_row('number');
CREATE TRIGGER surveys_audit AFTER INSERT OR UPDATE OR DELETE ON surveys FOR EACH ROW EXECUTE FUNCTION audit_row('number');
