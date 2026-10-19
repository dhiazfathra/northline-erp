# ADR-0036: Production demo: one Neon branch per Data Usaha, one Worker repointed between them

## Status
Accepted

## Date
2026-10-19

## Context
Production should show each of the four sandboxes (Manufaktur, Retail, Trade Portal, Kontraktor Demo) with their seeded
data. They cannot share one database: fixtures from different sandboxes must never mix, and the costing method locks
after the first stock move (Manufaktur/Retail FIFO, Trade Portal/Kontraktor AVERAGE, ADR-0031). There is no runtime
business profile yet (ADR-0031 steps 3-5 Proposed).

## Decision
- One Neon branch per profile in project `autumn-paper-67811977`: `production` (Manufaktur), `prod-retail`,
  `prod-trade`, `prod-contractor` (`apps/api/scripts/neon-branches.ts`).
- `scripts/seed.ts` takes `NL_PROFILE`; `scripts/seed/<profile>.ts` replays only that sandbox's fixtures and sets its
  costing method before any stock move.
- One Worker. `pnpm switch:prod <profile>` moves its `DATABASE_URL` secret to that branch's pooled URL.
- `pnpm deploy:prod [profile]` migrates + seeds every branch (or one), then deploys the Worker.

## Alternatives Considered
- **Four Workers**, all live at once: rejected for now (cost and four secrets to keep in step); a profile is one
  `switch:prod` away.
- **All fixtures in one database**: rejected, it mixes sandboxes and cannot hold both costing methods.

## Consequences
- Only one profile is live at a time; switching re-creates the Worker deployment (seconds).
- Aging basis (invoice date for Trade/Kontraktor) and the Kontraktor P&L style are still not company settings: the
  routes default to due date, and project reports need `?style=standard` (ADR-0031, ADR-0035).
- Four compute endpoints on the free tier; each scales to zero.
