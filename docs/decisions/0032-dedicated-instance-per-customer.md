# ADR-0032: One dedicated instance per paying customer before multi-tenancy

## Status
Proposed (2026-10-19), awaiting the owner's review. Driven by the go-to-market plan in
`docs/business/northline-business-brief.md`.

## Date
2026-10-19

## Context
The first customers are mid-market Indonesian companies moving their system of record off Accurate Online. They
will be sold through a free Parallel Close and need to go live on a period boundary (target: first contract by
31 January 2027, about 15 weeks away, built in evenings next to a full-time job).

The backend is single-company: `ledger_settings` is a singleton and every table assumes one set of books. The
workspace list, invites and roles in `apps/web/src/api/workspaces.ts` are mock. Making the event store, projections
and ~200 report queries tenant-aware is weeks of work that would land on the critical path to the first customer.

Corporate buyers also ask security questions a shared database answers worse: where their data lives, who else is
in it, and how they get it all back if they leave.

## Decision
Each paying customer gets its own deployment: one Cloudflare Worker (static web + `/api/*`, as in ADR-0017) and one
Neon project, provisioned from a script. No `tenant_id` column, no row-level security, no shared database.

- Same code and migrations for every instance; deploys roll out instance by instance.
- Each instance gets its own credentials, backups and restore drill.
- A Parallel Close runs on a throwaway instance that is deleted after the prospect decides.
- Revisit when instance count or per-instance cost makes this painful (rough trigger: ~20 instances, or rollout
  time above an hour).

## Alternatives Considered

### Shared database with `tenant_id` on every table
- Pros: one deploy, cheapest per customer at scale, the usual SaaS shape
- Cons: touches every table, the event store, projections and every report query; one missed filter leaks books
  between companies
- Rejected for now: the work sits on the critical path to customer one and adds a cross-tenant leak risk to a
  system of record

### Schema per tenant in one Postgres
- Pros: stronger isolation than `tenant_id`, one database to operate
- Cons: connection routing per request, migrations multiplied per schema, still a shared blast radius
- Rejected: most of the cost of multi-tenancy without the corporate-facing "your own instance" answer

### On-premise install
- Pros: answers data-residency objections fully
- Cons: support and upgrade burden a part-time solo founder can't carry
- Rejected: offer later as a paid tier if a customer requires it

## Consequences
- No schema change now; the first customer is unblocked by provisioning, backups and auth hardening only.
- "Your own instance, export any time" becomes a sales point in the security pack.
- Operational cost grows linearly: deploys, migrations and monitoring are per instance, so they must be scripted
  from the start (ADR-0018's on-demand deploy extends to "deploy all").
- Free-tier sizing in ADR-0017 no longer holds once customers pay; each instance needs paid-tier limits and the
  cost goes into pricing.
- Neon runs in `ap-southeast-1` (Singapore). A customer that requires data in Indonesia needs a different host;
  that is a pricing and hosting question, not a code change.
- Multi-tenancy, when it comes, is a migration with a superseding ADR, not a rewrite.
