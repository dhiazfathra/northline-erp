# ADR-0018: Local Postgres is the default; production deploys only on demand

## Status
Accepted

## Date
2026-10-19

## Context
ADR-0017 put production on Cloudflare Workers + Neon free tiers. Development is still active, with frequent schema
and data changes. `.env`'s `DATABASE_URL` pointed at Neon, so any local run, seed or experiment wrote to production
data and spent Neon compute-hours. Deploys were a manual sequence where running `wrangler deploy` before migrating Neon
ships code against a stale schema (docs/risks.md R1).

## Decision
- `DATABASE_URL` in `.env` is local Docker Postgres (`pnpm dev:db`, `pnpm seed`, `pnpm dev:api`).
- Neon URLs are renamed `NEON_DATABASE_URL` / `NEON_DATABASE_URL_UNPOOLED`; only `apps/api/scripts/deploy-prod.ts` reads them.
- Production changes only through `pnpm deploy:prod`: y/N prompt → build web → migrate + idempotent seed on Neon →
  `wrangler deploy`. No CI or git-triggered deploy.
- The seed skips accounts that already exist, so it runs on dev databases with older data.

## Alternatives Considered

### Neon dev branch per developer
- Pros: dev schema/data close to prod; branch reset from parent.
- Cons: every dev query wakes a Neon compute and counts against free compute-hours; needs network.
- Rejected: local Docker is free and offline; keep branches for one-off migration rehearsals.

### Deploy on push to `main` (Workers Builds / GitHub Actions)
- Pros: production always matches `main`.
- Cons: `main` moves several times a day while data shape is unstable; each push would migrate Neon and redeploy.
- Rejected until the schema settles.

### Separate `.env.production` file
- Rejected: two files with the same keys make it easy to load the wrong one; distinct `NEON_*` names fail loudly instead.

## Consequences
- Local and production data diverge on purpose; production holds only seed data plus whatever is entered there.
- Bare `npx wrangler deploy` still skips migrations; `pnpm deploy:prod` is the supported path.
- Neon tooling that writes `DATABASE_URL` back into `.env` (e.g. `@neon/env`) would silently re-point dev at Neon;
  check `.env` after using it.
- Revisit (deploy on push, migrations in CI) once the schema stabilizes.
