# Risk register: Cloudflare Workers + Neon production

Scope: the free-tier deploy in [ADR-0017](decisions/0017-cloudflare-workers-and-neon-free-tier.md) / [deploy.md](deploy.md).
Assessed 2026-10-18. Severity = likelihood × impact:

| | Low impact | Medium impact | High impact |
|---|---|---|---|
| **High likelihood** | Medium | High | Critical |
| **Medium likelihood** | Low | Medium | High |
| **Low likelihood** | Low | Low | Medium |

| # | Risk | Likelihood | Impact | Severity | Mitigation | Trigger to revisit |
|---|---|---|---|---|---|---|
| R1 | Worker deployed before `scripts/seed.ts` migrates Neon: code queries tables/columns that don't exist yet | Medium | High | **High** | deploy.md order: migrate (seed script) → `wrangler deploy`; never the reverse | Any new file in `apps/api/migrations/` |
| R2 | Outbox rows pile up unrelayed (no pg-boss relay on Workers) | High | Low | Medium | Nothing consumes the topics; rows are small | A consumer is needed → Cloudflare Queues relay (see ADR-0017) |
| R3 | Neon cold start + per-request TCP/TLS connect make the first request after idle slow | High | Low | Medium | Accepted to keep scale-to-zero | Users complain about latency → Hyperdrive |
| R4 | Neon free compute-hours or storage exhausted; DB suspended until the month resets | Low | High | Medium | No cron/queues/replicas; scale-to-zero on; check usage in the Neon console | Usage > 50% mid-month |
| R5 | Login PBKDF2 (100k iterations) exceeds the Workers free 10 ms CPU limit; login fails | Medium | Medium | Medium | Verified working 2026-10-18; hashes store their own iteration count | CPU-limit errors in Workers Logs → lower `ITER` |
| R6 | Credential leak: `DATABASE_URL` or the admin password (plaintext in local `.env`) | Low | High | Medium | `.env` gitignored; DB URL only as Wrangler secret | Leak suspected → rotate the Neon role password, `wrangler secret put`, reset the admin user |
| R7 | Data loss on the single `production` branch with no backups beyond Neon's free restore window | Low | High | Medium | Seed is reproducible; real data has no other copy | Real business data entered → scheduled `pg_dump` or paid plan |
| R8 | Write commits but inline projection catch-up fails: client sees 500, reports stale | Low | Medium | Low | Retry with the same idempotency key is safe; next write catches up | Repeated 500s on writes in logs |
| R9 | Workers free 100k requests/day exceeded; API returns errors until reset | Low | Medium | Low | Static assets don't count; only `/api/*` invokes the Worker | Daily requests > 50k |
| R10 | Users with legacy Bun argon2 hashes can't log in on Workers | Low | Medium | Low | Production users are created with PBKDF2 | Importing users from a Bun-era DB → reset their passwords |
| R11 | 10% log sampling, traces off: an incident's failing request may not be in the logs | Medium | Low | Low | Accepted for quota | Debugging an incident → temporarily raise `head_sampling_rate` |
