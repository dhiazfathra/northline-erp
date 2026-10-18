# api — ledger service

Hono on Bun, event-sourced Journal and Period aggregates (ADR-0001/0002), projections read by report queries.

```sh
docker run -d --name northline-pg -e POSTGRES_PASSWORD=northline -e POSTGRES_DB=northline -p 55432:5432 postgres:17-alpine
pnpm --filter api test                  # regression tests vs Accurate fixtures (docs/reports/fixtures)
DATABASE_URL=postgres://postgres:northline@localhost:55432/northline bun src/main.ts --role=all
bun run build                           # dist/northline-api single binary; --role=web|worker|all
./dist/northline-api rebuild ledger     # truncate read models and replay from position 0
docker build -f apps/api/Dockerfile .   # from repo root
```

| Path | |
|---|---|
| `migrations/` | events (append-only triggers), outbox, checkpoints, read models, deferred debit=credit trigger |
| `src/es/` | event store (append with expected version, upcasters, snapshots), outbox relay to pg-boss |
| `src/ledger/` | deciders (Journal, Period) and the command handler (idempotency keys) |
| `src/projections/` | `ledger` projection: journals, journal_lines, account_daily_balances, period_summaries |
| `src/reports/` | pure report functions + queries over projections |

API: `POST /api/ledger/commands` (PostJournal, ReverseJournal, ClosePeriod, ReopenPeriod) → `{ globalPosition }`;
`GET /api/reports/trial-balance?from&to[&after=<globalPosition>]` waits for projections to reach `after`.
