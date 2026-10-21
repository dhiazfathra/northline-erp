# Northline ERP

An event-sourced accounting ERP whose reports are tested to match [Accurate Online](https://accurate.id) (an Indonesian accounting SaaS) to the cell.

**Live demo:** https://northline-erp.dhiazfathra.workers.dev (seeded data; login on request) ·
**Status:** actively developed. The API and reports are tested; most of the web UI still runs on mock data (5 of 43 data calls in `apps/web/src/api` reach the API).
**Direction:** [strategy, parity matrix and scale tiers](docs/strategy/README.md) ([one-page visual](docs/strategy/northline-strategy.html)).

## Why it is interesting

Most ERP clones copy screens. This one copies **numbers**: each Accurate report was captured from a sandbox as a
fixture, and the API must reproduce it with zero diff.

- **288 of 291** Accurate reports verified by a zero-diff test across four demo companies; 3 are accepted divergences
  ([index](docs/reports/README.md), [ADR-0039](docs/decisions/0039-out-of-scope-reports-reopened.md)).
- **Event-sourced ledger with CQRS:** append-only events, a deferred debit = credit trigger in Postgres, and projections with checkpoints
  ([ADR-0001](docs/decisions/0001-event-sourcing-for-ledger.md), [ADR-0002](docs/decisions/0002-hand-rolled-event-store-on-drizzle.md)).
- Indonesian accounting rules: FIFO costing, PPN, fixed-asset depreciation, foreign-currency revaluation ([all ADRs](docs/decisions/README.md)).
- **Runs on two free tiers:** Cloudflare Workers + Neon Postgres, with no cron, so the database scales to zero
  ([ADR-0017](docs/decisions/0017-cloudflare-workers-and-neon-free-tier.md)).

It does not yet cover import, printable documents, e-Faktur export, bank or marketplace integration, POS, CRM, or bills of
materials; the [strategy](docs/strategy/README.md) ranks what comes next.
If you need a working ERP today, use Accurate, Odoo, or ERPNext.

## Run it locally

Requires [Bun](https://bun.sh) ≥ 1.3, pnpm, and Docker.

```sh
pnpm install
echo 'DATABASE_URL="postgres://postgres:northline@localhost:55432/northline"' >> .env   # local is the default
pnpm dev:db                                       # Postgres 17 in Docker on :55432
NL_EMAIL=me@example.com NL_PASSWORD=secret pnpm seed   # migrate + demo data + login
pnpm dev:api                                      # API on :3000 (watch mode)
pnpm dev                                          # web on Vite's port, proxies /api
pnpm --filter api test                            # 282 test cases against Accurate fixtures
```

Production (Cloudflare Worker + Neon) is deployed only on demand with `pnpm deploy:prod`; see [docs/deploy.md](docs/deploy.md).

## Layout

| Path | What |
|---|---|
| `apps/api` | Hono API: event store, ledger, sales/purchases/inventory/fixed assets, report queries ([README](apps/api/README.md)) |
| `apps/web` | React + TanStack Router + shadcn/ui |
| `packages/schemas` | Shared Zod schemas |
| `docs/reports` | One spec per Accurate report + captured fixtures |
| `docs/decisions` | Architecture decision records |
| `docs/strategy` | Strategic direction, parity matrix, scale tiers and cost model (`node tools/cost-model.mjs`) |
| `docs/runbooks` | How to operate each scale tier |
| `docs/deploy.md` | Cloudflare Workers + Neon deploy · [risk register](docs/risks.md) |

## Licence

No licence file yet: all rights reserved by default. Ask before reusing the code.
