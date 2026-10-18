# ADR-0017: Production on Cloudflare Workers + Neon, sized for both free tiers

## Status
Accepted

## Date
2026-10-18

## Context
The API ships as a Bun binary (`--role=web|worker|all`) with a pg-boss relay and a polling projection loop.
Production must run on Cloudflare Workers (free plan: 100k requests/day, 10 ms CPU/request) against Neon
(free plan: limited compute-hours, scale-to-zero after idle). Anything that keeps Neon awake or adds billable
resources burns the free quota.

## Decision
- One Worker (`apps/api/wrangler.jsonc`, entry `src/worker.ts`). Workers Static Assets serve `apps/web/dist` with SPA
  fallback; `run_worker_first: ["/api/*"]` so only API calls invoke the Worker (asset requests are free and unmetered).
- Postgres via the existing `postgres` driver over `nodejs_compat` TCP sockets to Neon's **pooled** endpoint, one client
  per request (`prepare: false`, closed in `ctx.waitUntil`). `DATABASE_URL` is a Wrangler secret.
- No background loop and no cron trigger: after each successful non-GET request the Worker runs projection
  `catchUp` inline, so reads see their writes and Neon idles to zero between users.
- The outbox→pg-boss relay does not run on Workers; nothing consumes those queues today. Outbox rows stay pending.
- Passwords move from Bun argon2 to PBKDF2-SHA256 (100k iterations, Web Crypto) so one hash verifies on both runtimes;
  argon2 hashes still verify under Bun only.
- Migrations and seed data run from a developer machine, never at Worker request time. Production is on demand only
  (`pnpm deploy:prod`: migrate + seed Neon, then `wrangler deploy`); local Docker Postgres is the default `DATABASE_URL` (ADR-0018).
- Observability: Workers Logs on at 10% head sampling, traces off.

## Alternatives Considered

### Hyperdrive in front of Neon
- Pros: pooled connections near the Worker, lower latency.
- Cons: another resource with its own daily query cap; Neon's pooler already absorbs connection churn at this traffic.
- Rejected for now: revisit if per-request connect latency matters.

### Cron trigger for projections and relay
- Rejected: even a 1/min cron keeps Neon compute awake around the clock and exhausts free compute-hours.

### Neon serverless driver (`@neondatabase/serverless`)
- Rejected: the code is written against Drizzle's postgres-js adapter and its transactions; swapping drivers touches every module.

## Consequences
- Writes take a little longer (projection catch-up in the request). Free-plan CPU limit (10 ms) excludes I/O wait,
  but a login's PBKDF2 is CPU-bound; verified 2026-10-18 that login succeeds on the free plan. If it starts hitting
  CPU-limit errors, lower `ITER` (hashes carry their own iteration count, so old ones keep verifying).
- Bun deploy (`Dockerfile`, `main.ts`) still works unchanged for local dev and tests.
- If a consumer for outbox topics appears, use Cloudflare Queues or reinstate the relay elsewhere.
