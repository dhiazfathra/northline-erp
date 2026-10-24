# Strategy loop state

Rendered from [state.json](state.json) by `bun loop` ([ADR-0050](../../decisions/0050-strategy-loop.md)); do not edit
by hand. Plan and loop changes: [CHANGELOG.md](CHANGELOG.md). Verification runs: `evidence/<item>/README.md`.

## Now

No item in progress. Next: `bun loop start`.

## Phase 0

- [x] P1: `bun loop` CLI: state, stage gates, plan changelog, evidence index
- [x] P2: `bun loop migration <name>` claims the number and registers it in `db.ts`
- [x] P3: `bun loop check` and `.github/workflows/check.yml` running it on every push and PR
- [x] P4: `bun loop pr`, `pr-body restore|verify` around the loop markers
- [x] P5: `bun loop evals`: G1–G10 twice on a fresh local DB, screenshots and videos
- [x] P6: `[G3]` round-trip and `[G6]` picker flows tagged in `tools/e2e`, counts ratcheted in the baseline
- [x] P7: Baseline taken from a green `bun loop evals` (evidence/strategy-loop)

## Baseline

| Measure | Value |
| --- | --- |
| `accurateZeroDiff` | 288 |
| `mockCalls` | 9 |
| `oxlintWarnings` | 1 |
| `g3Flows` | 2 |
| `g6Flows` | 2 |

## Items

| Item | Status | PR | Evals | CodeRabbit | Notes |
| --- | --- | --- | --- | --- | --- |
| N1 | awaiting merge | #3 | e2e 114/114 (not pass^2) | rate-limited at 09fc5c9 | Retro: docs/retro/2026-10-24-n1.md |
| N2 | queued |  |  |  | Loop scope: backup workflow and a restore drill against local Postgres. Owner steps: R2 and Neon secrets, first production dump, 5xx alert |
| N3 | owner-only |  |  |  | Owner decisions on ADRs and licence |
| N4 | blocked |  |  |  | Needs a prospect's Data Usaha and consent |
| N10 | done |  |  |  | Done in the strategy change |

## Plan

(none)

## Architecture suggestions

(none)

## Learnings

- N1 (G1): One writer for shared files (`app.ts`, `route-privileges.ts`, `db.ts`, migrations); migrations only via `bun loop migration`.
- N1 (G10): The PR body's loop section is rendered from state, so `/no-mistakes` overwriting it costs one `bun loop pr-body restore`.
