# Strategy loop state

Written and revised by the `strategy-loop` skill ([ADR-0050](../../decisions/0050-strategy-loop.md)). Owner edits
welcome; the loop reads this file first.

## Phase 0 (before N2)

- [ ] `tools/loop/next-migration.ts`: claims the next free number in `apps/api/migrations`, refuses duplicates.
- [ ] `tools/loop/check.ts`: api and web typecheck, oxlint against the warning baseline, `bun test` (api, web),
      duplicate migration numbers, `mock()` count against the baseline. Exit non-zero on any failure.
- [ ] `.github/workflows/check.yml`: runs `tools/loop/check.ts` with a Postgres service on every push and PR.
- [ ] `tools/loop/pr-body.ts`: `render`, `set`, `append-no-mistakes`, `verify` around the loop markers.
- [ ] `tools/loop/evals.ts`: runs G1–G10 twice, prints pass^2 per case.
- [ ] Round-trip and picker checks (G3, G6) added to `tools/e2e/n1-flows.mjs`.
- [ ] Baseline recorded below.

## Baseline

| Measure | Value | Date |
|---|---|---|
| Accurate zero-diff | 288 / 291 | 2026-10-21 |
| `mock()` files | 2 (`workspaces.ts`, `ai.ts`), after PR #3 merges | 2026-10-24 |
| oxlint warnings (web) | 1 | 2026-10-24 |
| API tests | 434 pass | 2026-10-24 |

## Items

| Item | Status | PR | Evals | CodeRabbit | Notes |
|---|---|---|---|---|---|
| N1 | done, awaiting merge | #3 | e2e 114/114 (not pass^2) | rate limited at `09fc5c9` | Retro: docs/retro/2026-10-24-n1.md |
| N2 | next | | | | Backups, restore drill, alerts |
| N3 | owner-only | | | | Owner decisions on ADRs and licence |
| N4 | blocked | | | | Needs a prospect's Data Usaha and consent |
| N5 | queued | | | | |

## Current plan

(empty: the loop writes the plan for the current item here)

## Learnings

- From N1: one writer for shared files (`app.ts`, `route-privileges.ts`, `db.ts`, migrations); e2e before PR;
  save the PR body before `/no-mistakes`.
