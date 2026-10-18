# ADR-0002: Hand-rolled event store on Drizzle (not Emmett)

## Status
Accepted

## Date
2026-10-18

## Context
ADR-0001 needs an append-only event store, projections with checkpoints, and an outbox, on PostgreSQL + Drizzle + pg-boss,
running on Bun. Candidates: Emmett (`@event-driven-io/emmett` + `emmett-postgresql`) or ~300 lines on top of Drizzle.

## Decision
Hand-roll the store on Drizzle. Keep the Emmett vocabulary (`decide`/`evolve`, command handler, projections) so a
later move to Emmett is mechanical.

## Alternatives Considered

### Emmett
- Pros: proven decide/evolve + command handler, PostgreSQL event store, projections, testing helpers (`DeciderSpecification`).
- Cons: owns its own schema (`emt_*` tables, partitioning) — not the column contract we need (`global_position`,
  `metadata`, update/delete triggers); pulls in `pg`/Pongo next to Drizzle, so two DB clients and two migration paths;
  its inline projections and our deferred debit=credit constraint must share one transaction we control.
- Rejected: we would fight its schema to get ours, and the parts we use are small.

### Generic ES libraries (EventStoreDB client, Marten-like ports)
- Rejected: extra infrastructure or non-TypeScript.

## Consequences
- We own: append with expected version, read stream, read-all from position, projector loop with checkpoints,
  outbox relay. Each gets direct tests against Postgres.
- One DB client (Drizzle over `postgres`). Migrations are hand-written SQL (triggers and deferred constraints are
  the point), embedded in the binary and applied in order by `migrate()`; drizzle-kit is not used.
- If the hand-rolled code grows past what Emmett gives for free, revisit.
