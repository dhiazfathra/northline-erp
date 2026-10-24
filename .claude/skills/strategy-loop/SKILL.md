---
name: strategy-loop
description: Works the next item of docs/strategy/README.md (N1, N2, …) end to end in one agent loop - plan, build, e2e, PR, /no-mistakes, CodeRabbit, architecture pass, retro - and updates docs/strategy/loop/STATE.md. Use when asked to "run the loop", "do the next strategy item", "continue N<k>", or /strategy-loop.
disable-model-invocation: true
---

# Strategy loop

One iteration = one backlog item, done in this context. Decision record: `docs/decisions/0050-strategy-loop.md`.

## Before anything

1. Read `docs/strategy/loop/STATE.md`. It names the current item, its plan and the stage reached. Resume from that stage.
2. If phase 0 in STATE.md is not done, do phase 0 first. It is the tools and evals the rest depends on.
3. Run `bun tools/loop/check.ts` and the golden evals (`evals/golden.md`) on `main`. Record the baseline in STATE.md. If the baseline is red, fix it, or stop and say why.

## Pick and plan

- Take the next unfinished item in score order from `docs/strategy/README.md` (H0 first). Skip items marked owner-only in STATE.md.
- Stop and ask the owner if the item has Ambiguity 5, depends on an owner decision (N3), or needs external access the repo does not have (credentials, a prospect's data).
- Write the plan into STATE.md: the item's "done when" as a checkable command, slices in order, the files each slice touches, and the new eval case(s) it needs. Revise the plan in STATE.md whenever reality differs; never keep a stale plan.
- Create a worktree: `git worktree add -b feat/<item>-<slug> ../northline-<item> main`.

## Build

- Build slices one after another in this context. Do not spawn writing subagents.
- Claim migration numbers with `bun tools/loop/next-migration.ts <name>`, never by hand.
- No silent data loss: every field a form sends is either stored and read back, or disabled in the form and refused with 409 by the API. The round-trip eval checks this.
- Add the item's eval case(s) red first, then make them green.
- After each slice: `bun tools/loop/check.ts`. Fix before the next slice.

## Verify

- Spawn the **e2e verifier** (the only standing subagent): give it the item, the seeded DB and `tools/e2e/`. Do not give it your diff. It adds flows for the item, runs all flows, fixes what fails, and reports.
- Run the golden evals twice. Both runs must pass (pass^2).
- Update ADRs, `docs/strategy/README.md` (scorecard, status), `docs/strategy/parity-matrix.md` and the user guide in the same branch. Follow the `documentation-and-adrs` skill.

## Gate (see prompts/gate.md for the exact commands)

1. Commit, push, open the PR. Write the body with `bun tools/loop/pr-body.ts set`.
2. `/no-mistakes` with the item's intent. Then `bun tools/loop/pr-body.ts append-no-mistakes` so the original body survives.
3. CodeRabbit: read unresolved threads, verify each one, then fix it or decline with a reason. Reply in the thread with the SHA, then resolve it. Repeat until CodeRabbit approves or rate-limits, at most 2 rounds. Record a rate limit and the unreviewed SHA in STATE.md.

## Architecture pass

1. Run `/improve-codebase-architecture` scoped to the files this item changed. Save the report as `docs/reports/architecture/<item>.html`, not in the temp dir.
2. Implement every suggestion, one commit each. After each commit run the check and the evals. A suggestion that breaks an eval and cannot be fixed in one round is reverted and logged in STATE.md. Posting, costing and tax code also needs `bun apps/api/scripts/coverage.ts` to stay at its baseline.
3. Push, and run steps 2 and 3 of the gate again on the new commits.

## Retro and close

1. Run `/retro` on the iteration. Write it to `docs/retro/<date>-<item>.md`.
2. Self-improvement rule: change this skill, a prompt or a tool only together with the eval case or check that would have caught the problem. At most 2 such changes per item. Note each one in STATE.md under "Learnings".
3. Mark the item done in STATE.md (PR link, eval result, CodeRabbit status) and pick the next item.

## Stop and ask the owner

- The same eval fails in 2 rounds.
- Any Accurate zero-diff report changes, or a ledger diff appears.
- A migration or deploy would touch a production Neon branch.
- An item needs an owner decision or outside data.
