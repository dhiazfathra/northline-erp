-- Access enforcement (P5, ADR-0040): routes check Akses Grup privileges (src/route-privileges.ts). Users that exist
-- now keep full access, so current data and logins work as before; users created from here on start with none.
ALTER TABLE users ADD COLUMN full_access boolean NOT NULL DEFAULT true;
ALTER TABLE users ALTER COLUMN full_access SET DEFAULT false;
