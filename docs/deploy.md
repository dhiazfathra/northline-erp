# Deploy: Cloudflare Workers + Neon

Design and trade-offs: [ADR-0017](decisions/0017-cloudflare-workers-and-neon-free-tier.md).

| Piece | Where |
|---|---|
| Worker | `northline-erp` → https://northline-erp.dhiazfathra.workers.dev, config `apps/api/wrangler.jsonc`, entry `apps/api/src/worker.ts` |
| SPA | `apps/web/dist`, served by Workers Static Assets |
| Database | Neon project `autumn-paper-67811977` (see `.neon`), branch `production`, region `ap-southeast-1` |

## First deploy

```sh
pnpm install && pnpm --filter web build
# migrations + seed (idempotent): trial-balance ledger, sales-t2 customers/items/invoices, one login
DATABASE_URL="$DATABASE_URL_UNPOOLED" NL_EMAIL=admin@northline.app NL_PASSWORD=… bun apps/api/scripts/seed.ts
cd apps/api
npx wrangler login
npx wrangler secret put DATABASE_URL      # paste the Neon POOLED url (…-pooler…)
npx wrangler deploy
```

## Redeploy

```sh
pnpm --filter web build && (cd apps/api && npx wrangler deploy)
```

New migrations: add to `apps/api/src/db.ts`, then rerun `scripts/seed.ts` (it migrates first). The Worker never migrates.

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
