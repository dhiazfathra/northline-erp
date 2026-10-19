# Deploy: Cloudflare Workers + Neon

Design and trade-offs: [ADR-0017](decisions/0017-cloudflare-workers-and-neon-free-tier.md). Risks: [risks.md](risks.md).

| Piece | Where |
|---|---|
| Worker | `northline-erp` → https://northline-erp.dhiazfathra.workers.dev, config `apps/api/wrangler.jsonc`, entry `apps/api/src/worker.ts` |
| SPA | `apps/web/dist`, served by Workers Static Assets |
| Database | Neon project `autumn-paper-67811977` (see `.neon`), region `ap-southeast-1`, one branch per Data Usaha ([ADR-0036](decisions/0036-one-neon-branch-per-profile.md)): `production` (Manufaktur), `prod-retail`, `prod-trade`, `prod-contractor` |

## Local is the default

Why: [ADR-0018](decisions/0018-local-default-on-demand-production.md).

`.env` `DATABASE_URL` points at local Docker Postgres (`pnpm dev:db`, `pnpm seed`, `pnpm dev:api`). Neon URLs live in
`NEON_DATABASE_URL` / `NEON_DATABASE_URL_UNPOOLED` and nothing reads them except the deploy script. There is no CI or
git-triggered deploy: production changes only when someone runs `pnpm deploy:prod`.

## Deploy (on demand)

```sh
pnpm deploy:prod [profile]   # asks y/N, then: build web → migrate + seed each branch (or one) → wrangler deploy
pnpm switch:prod retail      # point the Worker at manufaktur | retail | trade | contractor
```

Branch URLs come from the `neon` CLI (`neon auth` once); nothing is printed. Migrations run before the Worker ships (risks.md R1). The seed is idempotent: it adds missing fixture rows and never deletes.

First time only: `cd apps/api && npx wrangler login && npx wrangler secret put DATABASE_URL` (paste the Neon **pooled** URL).

## Free-tier guardrails
- No cron, no queues, no Hyperdrive, no KV/D1: nothing wakes Neon unless a user calls `/api/*`.
- Static assets never invoke the Worker (`run_worker_first: ["/api/*"]`).
- Logs sampled at 10%, traces off. Preview URLs off.
- Neon: keep the default scale-to-zero; don't add read replicas or extra long-lived branches.

## Smoke test

```sh
curl -s -c /tmp/c -H 'content-type: application/json' -d '{"email":"admin@northline.app","password":"…"}' https://northline-erp.dhiazfathra.workers.dev/api/auth/login
curl -s -b /tmp/c 'https://northline-erp.dhiazfathra.workers.dev/api/reports/trial-balance?from=2033-01-01&to=2033-12-31'
```
