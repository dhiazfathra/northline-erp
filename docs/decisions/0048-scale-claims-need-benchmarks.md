# ADR-0048: No scale claim without a published benchmark; the Go port waits for one

## Status
Proposed (2026-10-21), awaiting the owner's review.

## Date
2026-10-21

## Context
Correctness has evidence: every done report is a zero-diff test against an Accurate fixture. Scale has none. There are
no load tests, no synthetic volume beyond the demo seeds, and no recorded latency. Enterprise buyers ask for numbers,
and so does the cost model in ADR-0047, which rests on assumed requests and CPU per user.

`docs/migration/hono-to-go.md` (Draft) proposes porting the API to Go. A port adds no customer-visible value. It is
only worth doing if the TypeScript runtime cannot meet a tier's targets.

## Decision
- **Every tier has SLOs.** These are availability, RPO, RTO, write p95 and report p95, listed in
  [scale-and-cost.md](../strategy/scale-and-cost.md). A tier counts as proven only when a benchmark at that tier's
  volume meets them.
- **The benchmark harness lives in the repo.**
  - A volume generator posts synthetic documents through the real command handlers, so events, projections and
    reports are all exercised.
  - k6 write-mix and report-mix profiles drive the load.
  - Each run uses a throwaway Neon branch sized for the tier.
  - Each run checks two things: rebuilding projections from event 0 reproduces the trial balance, and the
    Accurate zero-diff suite still passes.
- **Results are published as files.** Each lands in `docs/scale/results/<tier>-<yyyy-mm-dd>.md` with the commit,
  database configuration, p50/p95/p99, error rate and the run's own cost. A quote or sales page may cite only a tier
  whose latest result passes.
- **The Go port stays parked** until a benchmark shows the Bun runtime missing an SLO that configuration (CU size,
  Hyperdrive, replicas) cannot fix.

## Alternatives Considered

### Size from vendor limits and experience, test with the first big customer
- Rejected: the first big customer becomes the load test, and the cost model stays unverifiable

### Port to Go first for performance
- Rejected: no measurement says the current runtime is the bottleneck. The port would touch every module with no new
  feature.

## Consequences
- The harness is backlog item N9, before any T2 sale.
- Benchmark runs cost money on Neon Scale. Each result records that cost, and the branch is deleted afterwards.
- If T3 or T4 fails on Neon at its ceiling (56 CU fixed), the on-premise option in ADR-0047 becomes the tier's
  default. That decision follows the evidence, not preference.
