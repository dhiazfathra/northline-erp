# ADR-0001: Event sourcing + CQRS for the ledger (supersedes "CQRS-lite")

## Status
Accepted — supersedes the earlier, unrecorded "CQRS-lite" decision (single state tables, separate read queries).

## Date
2026-10-18

## Context
The accounting module's acceptance spec is Accurate's *Daftar Laporan* (see `docs/reports/`). Every report number
must be traceable back to the journal lines that produced it, and periods must be closable without losing history.
CQRS-lite kept mutable `journals` rows: edits overwrite history, a correction leaves no trail, and rebuilding a report
"as it was" on a past date needs a separate audit log that can drift from the data.

Requirements that pushed the change:
- Audit trail is the data, not a side log (ISO 27001, PDP Law, external audit).
- Corrections in a closed period must be reversal entries, never edits.
- Reports (trial balance, P&L, balance sheet, ledger) are derived views we must be able to rebuild and diff against Accurate.

## Decision
Event-source the write side from day one, scoped to the **Journal** and **Period** aggregates (Account follows later).
Master data (chart of accounts, customers, vendors) stays as plain tables with an audit-history table.

- Write side: append-only `events` table — `stream_id`, `stream_version`, `event_type`, `payload`, `metadata`,
  `global_position` (identity), `created_at`; unique `(stream_id, stream_version)` for optimistic concurrency;
  triggers reject `UPDATE`/`DELETE`.
- Commands are Zod-validated, carry an idempotency key, and are handled by pure `decide(state, command) → events`
  functions; `evolve(state, event)` rebuilds state. Upcasters map old event versions; snapshots are added per aggregate
  when stream length makes them pay.
- Invariants: debits = credits (domain check and a deferred constraint on the `journal_lines` projection); posting into a
  closed period is rejected; corrections are `JournalReversed` events plus a new journal.
- Read side: projections consume events ordered by `global_position`, one checkpoint row per projection, written in the
  same transaction as the read-model change. Read models: `journal_lines`, `account_balances`, `period_summaries`,
  trial balance, P&L. Queries read only projections. A rebuild command truncates a read model and replays from 0.
- Integration: transactional outbox written with the events; a relay publishes to pg-boss for side effects.

## Alternatives Considered

### Keep CQRS-lite (mutable tables + audit log)
- Pros: simpler, familiar, fewer moving parts.
- Cons: history lives in a second store that can disagree with the data; "report as of date X" needs bespoke code.
- Rejected: the audit trail and replayable reports are the core requirement, not a nice-to-have.

### Event-source everything (incl. master data)
- Pros: one model.
- Cons: master data is CRUD-shaped, rarely needs replay; doubles the initial build.
- Rejected for now; revisit per entity when a report needs its history.

## Consequences
- Every report is a projection we can drop and replay, which makes the Accurate diff loop cheap.
- Eventual consistency between command and query; the API returns the new `global_position` so the UI can wait for it.
- Schema changes to events need upcasters; event types are versioned in the shared Zod package.
- More code than CRUD: decide/evolve, projector runner, checkpointing, rebuild tooling.
