# Runbook: operating each scale tier

Date: 2026-10-21. Tiers, SLOs and costs: [docs/strategy/scale-and-cost.md](../strategy/scale-and-cost.md)
([ADR-0047](../decisions/0047-deployment-tiers.md)). Commands marked **(to build: N6)** and the like don't exist yet; the
tag names the backlog item in [docs/strategy/README.md](../strategy/README.md). Everything else runs today.

## Every tier

- **Migrate before code.**
  - Serverless: `pnpm deploy:prod` migrates Neon, then runs `wrangler deploy`. A bare `wrangler deploy` skips the
    migration (risk R1).
  - On-premise: the binary runs `migrate()` at start.
- **Secrets.** `DATABASE_URL` lives only in Wrangler secrets or the host's secret store, never in git. Rotate as in
  [risk R6](../risks.md).
- **Smoke test after every deploy.** Use [docs/deploy.md#smoke-test](../deploy.md#smoke-test). On failure, roll back
  the code: `wrangler rollback` on Workers, or the previous binary on-premise. Migrations are forward-only, so a
  rollback must not depend on reversing one.
- **Monthly restore drill.**
  1. Restore the latest backup into a throwaway database.
  2. Run the smoke test against it.
  3. Record the restore time in `docs/runbooks/drills.md` (to build: N2).
- **Correctness check after any projection or migration incident.** Rebuild with `bun apps/api/src/main.ts rebuild
  ledger`, then compare the Neraca Percobaan before and after.

## T0 Trial (today's production)

| Step | How |
|---|---|
| Provision | Neon project with one branch per profile: `bun apps/api/scripts/neon-branches.ts` (ADR-0036) |
| Deploy | `pnpm deploy:prod [profile]`; switch the live profile with `pnpm switch:prod <profile>` |
| Backup | None needed; `NL_PROFILE=<profile> pnpm seed` rebuilds any branch |
| Watch | Neon compute-hours under 50% by mid-month (R4); Worker requests under 50k a day (R9) |
| Move up | A signed customer, or real data entered |

## T1 Small (serverless, a Neon project per tenant)

| Step | How |
|---|---|
| Provision | `tenant-create <slug> --profile <profile>` creates a Neon project (Launch, Singapore), migrates, seeds the profile and registers the hostname (to build: N6). Use the pooled connection string. |
| Deploy | One Worker for all tenants: `pnpm deploy:prod`. Migrations run per tenant, in the registry's order (to build: N6) |
| Backup | Neon instant restore (7 days) for mistakes; a nightly `pg_dump -Fc` to R2, 30 kept, for off-provider copies (to build: N2) |
| Restore | Mistake inside 7 days: Neon restore to a timestamp, onto a new branch first, check, then promote. Older: `pg_restore` an R2 dump into a fresh branch |
| Watch | Worker 5xx rate, write p95 under 800 ms, report p95 under 3 s, Neon CU-hours per tenant |
| Incidents | Slow first request after idle (R3): accept, or set a minimum compute in office hours. Login CPU errors: confirm the Workers Paid plan (30 s CPU cap) |
| Move up | More than 25 users, more than 5k documents a month, or report p95 over 3 s for two weeks |

## T2 Mid-market (serverless, Neon Scale)

| Step | How |
|---|---|
| Provision | As T1, on the Neon Scale plan: autoscaling 0.5 to 2 CU, scale-to-zero only outside 06:00 to 22:00 WIB, 30-day restore. Add a Hyperdrive config and bind it to the Worker |
| Deploy | Canary first: deploy, smoke test on one internal tenant, then let every tenant through (Workers gradual deployments). Customer-facing changes go out after 18:00 WIB |
| Backup | 30-day instant restore, plus nightly R2 dumps |
| Restore | Target RTO 1 h. Drill monthly against this tier's largest tenant |
| Watch | SLO burn alerts at 2% of the monthly error budget per day; Neon CPU above 80% for 15 min means raise the max CU |
| Incidents | Report p95 breach: add a read replica and route `/api/reports/*` to it (to build: E1). Write p95 breach: check the inline projection catch-up time in logs |
| Move up | More than 150 users, more than 50k documents a month, a database over 200 GB, or a residency requirement |

## T3 Enterprise

**Serverless.** Run T2, plus these:

| Step | How |
|---|---|
| Runtime | Projections run on a Queues consumer instead of inline; reports read from a replica (4 CU, office hours); events are partitioned by month (to build: E1). SSO and MFA (to build: E2) |
| Change control | A written change for every deploy, a monthly maintenance window, and the customer's approver on the change |
| Backup | Neon 30-day restore, weekly logical dump to R2 (4 kept), quarterly restore drill with the customer present |
| Watch | Queue backlog age under 30 s; projection checkpoint lag; replica lag |

**On-premise** (Jakarta colocation, from the bill of materials in the cost model):

| Step | How |
|---|---|
| Build | 2 app nodes run `northline --role=web` behind HAProxy. 1 node runs `--role=worker`, with a second on standby. 2 DB nodes run Postgres 17 under Patroni with synchronous replication. 1 backup node runs pgBackRest (full weekly, differential daily, WAL archived continuously), with an off-site copy to R2 |
| Package | OCI image of `bun build --compile`, run as Podman Quadlet units (to build: E3) |
| Deploy | Rolling: drain one app node, swap the image, smoke test, then the next. The worker goes last |
| Restore | `pgbackrest restore --type=time` to a scratch host, check the trial balance, then switch over. Target RTO 1 h |
| Watch | Prometheus: replication lag, disk at 70%, WAL archive age, projection lag, HTTP p95; Loki for logs; Grafana alerts to the on-call phone |
| Incidents | Primary down: Patroni promotes the standby (check that the leader changed), then rebuild the old primary as a standby. Disk full: extend the volume or prune WAL archives past retention, never live WAL |

Move up when there are more than 1,000 users, a second legal entity needs consolidation, or the required RTO is under
1 h.

## T4 Large group

T3, plus the following:

| Step | How |
|---|---|
| Topology | Serverless: a primary at 32 CU fixed, two report replicas, and a DR standby project in a second region fed by logical replication. On-premise: a primary site and a DR site per the bill of materials, with asynchronous replication to DR |
| Failover drill | Quarterly. Promote DR, point the tenant registry (or DNS, on-premise) at it, run the smoke test and the trial-balance check, then fail back. Target RTO 15 min |
| Capacity | Monthly review of CU use, replica lag, storage growth and archive size; re-run the T4 benchmark before any 2× growth |
| Data lifecycle | Close and archive periods older than the retention policy, so reports read the hot partitions only |
| Ops | 24×7 on-call rotation (at least 4 people on-premise); post-incident review within 5 working days |
