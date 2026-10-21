# ADR-0047: Five deployment tiers: Workers + Neon by default, on-premise for residency or beyond Neon's ceiling

## Status
Proposed (2026-10-21), awaiting the owner's review. Extends ADR-0017 (T0 stays on both free tiers) and ADR-0032
(dedicated database per customer). Numbers: [docs/strategy/scale-and-cost.md](../strategy/scale-and-cost.md).

## Date
2026-10-21

## Context
Buyers range from 10-user firms leaving Accurate to groups with thousands of staff. Each asks the same two questions:
will it hold our volume, and what will it cost to run? Today there is one shape: a single Worker repointed between four
Neon branches (ADR-0036), sized for the free plans, with projections caught up inline after each write (ADR-0017).

The same code already runs outside Workers. `apps/api/src/main.ts` is a Bun binary with `--role=web|worker|all`, and
`docs/migration/hono-to-go.md` documents it. Neon's Scale plan tops out at 16 CU autoscaling, or 56 CU fixed
(224 GB RAM). Neon has no Indonesian region (nearest: Singapore, per neon.com/docs/introduction/regions on 2026-10-21), so data that
must stay in Indonesia cannot live there.

`tools/cost-model.mjs` prices each tier from the Cloudflare and Neon price pages (read 2026-10-21), with on-premise
CapEx and OpEx alongside. Counting ops staff, serverless costs 1.9 to 7.8 times less than on-premise at every tier.

## Decision
- **Five tiers, each with a workload, an SLO, a runbook and a cost line.** T0 Trial (free plans), T1 Small (≤ 25 users),
  T2 Mid-market (≤ 150), T3 Enterprise (≤ 1,000), T4 Large group (> 1,000, multi-company).
- **Serverless is the default from T0 to T3.** Workers serves the web app and `/api/*`. Each customer gets its own Neon
  project: Launch for T1, Scale for T2 and above, for the SLA, SOC 2 and 30-day restore.
- **One Worker serves many tenants.** It maps the request's hostname to that tenant's database through an encrypted
  tenant registry. This replaces ADR-0032's Worker per customer: isolation stays at the database, and deploys happen
  once instead of N times.
- **T3 and up change the runtime shape.** Hyperdrive pools connections. Projections run asynchronously on Cloudflare
  Queues instead of inline. Reports read from a replica. The event store is partitioned by month.
- **On-premise is a supported tier option, not the default.** It applies when data must stay in Indonesia, when a
  customer requires its own hardware, or past Neon's 56 CU ceiling. It runs the same Bun binary (`--role=web` behind a
  load balancer, `--role=worker` for projections) on Postgres 17 with a synchronous standby, pgBackRest, and off-site
  copies in R2. The customer carries the CapEx.

## Alternatives Considered

### On-premise or IaaS as the default for paid tiers
- Pros: no vendor ceiling, data residency by default
- Cons: 1.9 to 7.8 times the monthly cost once ops staff is counted (cost model), and a pager for every customer
- Rejected: reserved for buyers whose regulation or policy requires it

### Shared database with `tenant_id`
- Rejected again for the reasons in ADR-0032: it touches every table and every report query, and one missed filter
  leaks books between companies

### A Worker per customer (ADR-0032 as written)
- Pros: full isolation down to code version
- Cons: N deploys per release, N sets of secrets; ADR-0032's own trigger (around 20 instances, or rollouts over an
  hour) arrives early
- Rejected: database-level isolation keeps the security answer, and code-level isolation buys little

## Consequences
- New work, all listed in the plan: tenant registry and provisioning script (N6), nightly R2 backups and restore drills
  (N2), Hyperdrive and Neon Scale settings (T2), a Queues projector and replica routing (E1), and an on-premise
  package (E3).
- Each tier is sold only after its benchmark passes (ADR-0048).
- Prices are inputs to `tools/cost-model.mjs`. When a vendor changes its price, rerun the script and update the doc in
  the same commit.
- Neon's region list and Indonesian residency rules (PP 71/2019, POJK for financial firms) need checking with counsel
  before the first regulated T3 bid.
