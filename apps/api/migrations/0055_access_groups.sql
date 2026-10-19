-- Users and access (P3.4; fixture docs/reports/fixtures/access-m49.json): mobile on users (name is from 0040), which users a
-- branch admits, and access groups (Akses Grup) with their members, time restriction and privileges. Nothing here is
-- enforced yet (P5); login and sessions are unchanged.
ALTER TABLE users ADD COLUMN mobile text;
ALTER TABLE branches ADD COLUMN all_users boolean NOT NULL DEFAULT true;
CREATE TABLE branch_users (
  branch  text   NOT NULL REFERENCES branches (name),
  user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  PRIMARY KEY (branch, user_id)
);
CREATE TABLE access_groups (
  name              text PRIMARY KEY,
  restriction_days  text NOT NULL DEFAULT 'MONDAYFRIDAY' CHECK (restriction_days IN ('MONDAYFRIDAY')),
  restriction_from  text NOT NULL DEFAULT '00.00',
  restriction_to    text NOT NULL DEFAULT '23.59',
  privileges        jsonb NOT NULL DEFAULT '{}' -- catalog key (src/access/privilege-catalog.json) -> granted actions
);
CREATE TABLE access_group_users (
  group_name text   NOT NULL REFERENCES access_groups (name),
  user_id    bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  PRIMARY KEY (group_name, user_id)
);
CREATE TRIGGER access_groups_audit AFTER INSERT OR UPDATE OR DELETE ON access_groups FOR EACH ROW EXECUTE FUNCTION audit_row('name');
