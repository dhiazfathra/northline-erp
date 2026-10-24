# ADR-0050: One agent loop works the strategy backlog item by item, gated by a deterministic CLI and evals

## Status
Proposed (2026-10-24), awaiting the owner's review. The tooling exists and is tested; no backlog item has run through it.

## Date
2026-10-24

## Context
[docs/strategy/README.md](../strategy/README.md) ranks work as N1, N2, … with a "done when" column. N1 was
delivered in PR #3 by a coordinator plus six subagents ([retro](../retro/2026-10-24-n1.md)). It worked, but most
of the rework came from the orchestration itself: parallel writers collided on the migration sequence and on
`app.ts`, rules had to be relayed between agents, and 3 of 4 slices needed a second round for silent data loss.

Anthropic's guide "When to fold subagents into your main agent loop" (2026-10-22) recommends one model, one
context and one tool loop by default. Procedures go in skills, hard limits in tools, and the model writes and
revises its own plan. Subagents stay only for measured context bloat, disposable parallel work or tool overload.
Evals come before refactoring: 10 golden examples, each run more than once.

The first version of this ADR described the loop in prose and listed its tools as "phase 0, not built". The owner
then asked for everything deterministic to move into tools, for token efficiency and predictability, for a plan the
agent can revise with a changelog, and for verification evidence (markdown, logs, screenshots, videos). An
independent review of that version found 24 problems, 14 of them high; the decisions below answer them.

## Decision
- **One main loop, one item per session.** The `strategy-loop` skill is a short driver: `bun loop next` prints the
  current stage's steps and exit checks, the agent does the judgment work, `bun loop advance` moves the stage only
  when its exit checks pass. Stages, in order: plan, build, verify, arch, gate, retro, done.
- **State is data, docs are rendered.** `docs/strategy/loop/state.json` is the only state; the CLI writes it.
  `STATE.md`, the golden-eval table, each item's evidence index and the PR body's loop section are rendered from it,
  and a `state` check fails when `STATE.md` was edited by hand. State lives on the item branch; the next item starts
  only after the previous item's PR is merged, so main always holds the latest state.
- **Items are picked, not chosen.** `bun loop start` takes the next row of the strategy README in order, skips rows
  marked done, owner-only, blocked or awaiting merge, and stops on ambiguity 5, a missing "done when", an unmerged
  earlier PR or open phase-0 work. It creates `../northline-<item>` on `feat/<item>-<slug>` from `origin/main`.
- **The plan is revisable and every revision is logged.** `bun loop plan <file> --reason` validates the plan,
  bumps its version and appends a structural diff (slices added, removed, retitled, re-filed or reordered; done-when;
  promised eval flows; owner steps) to `docs/strategy/loop/CHANGELOG.md`. A changed done-when or a dropped eval flow
  is marked ⚠ and repeated in the PR body. Slice progress is not a plan change and is not logged.
- **Hard limits are tools.**
  - `bun loop migration <name>` creates the next migration and registers it in `db.ts`; the `migrations` check
    fails on a duplicate number or an unregistered file.
  - `bun loop check` runs typecheck (api, web, `tools/loop`), oxlint against its baseline, both test suites on the
    loop's own database, the migration registry, the `mock()` count, the zero-diff count, the Accurate-report diff
    and the state check. CI runs the same command on every push and PR.
  - A PreToolUse hook (`tools/loop/guard.ts`) blocks Neon CLI and MCP tools, `NEON_*`, `neon.tech`, wrangler,
    `deploy:prod` and `switch:prod` while any worktree has an item in progress. The e2e database script refuses any
    host but localhost.
- **Evals first, pass^2 where it matters.** `bun loop evals` runs the static steps once (they cannot flake) and the
  test suites and the e2e stack twice, each on a fresh local database with the API and web on free ports. Cases
  G1–G10 are judged from step results. `[G3]` round-trip and `[G6]` picker flows are counted, and their counts, the
  `mock()` count, oxlint warnings and the zero-diff count move only through `bun loop baseline`, which ratchets them
  in the improving direction.
- **Evidence is a by-product.** Every check, e2e and evals run appends to `evidence/<item>/runs.jsonl` and keeps
  its logs. E2e runs keep a screenshot and a video for each failed flow and each flow tagged `[<item>]` (at most 20
  a run), plus `results.json`. The rendered `evidence/<item>/README.md` shows runs, the pass^2 table and the media;
  the PR body links it and inlines up to four screenshots. Passing runs keep only their latest logs and media.
- **One subagent.** The `e2e-verifier` agent (`.claude/agents/e2e-verifier.md`) writes flows under `tools/e2e/`
  and reports failures without seeing the diff; the main agent fixes the app. In N1 it was the only orchestration
  with a measured payoff (5 bugs that unit tests missed).
- **The architecture pass runs before the gate.** `/improve-codebase-architecture` cannot be invoked by the model
  and is interactive, so `bun loop prompt architecture` runs its method with overrides: scope is the item's changed
  files, ADRs are read from `docs/decisions/`, the report goes to `docs/reports/architecture/<item>.html`, and there
  is no grilling. Every candidate is recorded with `bun loop arch add` and implemented as its own commit; one that
  keeps a check red after one fix round is reverted and logged. Running it before the gate means no-mistakes and
  CodeRabbit review the final diff once.
- **The gate is driven, not narrated.** `bun loop nm` drives `no-mistakes axi` without `--yes`: auto-fix findings
  go back to the pipeline, no-op findings are approved, and ask-user, protected-path or unvalidated-work findings
  stop the loop for the owner. no-mistakes pushes and opens the PR, so CodeRabbit's first review sees the gated
  head. `bun loop pr` adopts the PR and puts the loop section above the no-mistakes text. `bun loop cr` lists
  unresolved threads one line each, prints CodeRabbit's own agent prompt for a thread on demand, replies and
  resolves, and waits (30 minutes at most) until CodeRabbit approves, reviews the head, rate-limits or has done 2
  rounds. Follow-up fixes and the retro go out through `bun loop nm` again.
- **Self-improvement needs a check.** `bun loop retro` writes the run facts (failed runs, plan changes,
  architecture outcomes, time against budget, gate results) and leaves TODOs for the judgment parts.
  `bun loop learn --check <case or step>` records a change to the loop and refuses one without an existing case or
  step or past 2 per item; the `state` check fails when loop files changed without one.
- **Stop and ask the owner** (CLI exit 3): the same case fails in two evals runs, the same step fails in three check
  runs, Accurate reports change, no-mistakes needs the owner, the item passes its time budget (12 h by default), or
  `start` refuses an item.

## Alternatives Considered

### Keep the N1 shape (coordinator plus parallel slice agents)
- Pros: more wall-clock parallelism.
- Cons: the shared files (`app.ts`, `route-privileges.ts`, `db.ts`, migrations) make slices dependent anyway;
  rules got lost between agents; most rework came from this.
- Rejected: N1 measured the cost, and nothing measured a benefit.

### Prose procedure with tools to build later (the first version of this ADR)
- Pros: less code to review.
- Cons: the reviewer found the procedure could not run as written. The architecture and retro skills cannot be
  invoked by the model, `--yes` would let no-mistakes fix the owner's ask-user findings, the CodeRabbit wait had no
  exit, opening the PR before no-mistakes spent a CodeRabbit review on an ungated head, and nothing said where
  state lived between worktrees.
- Rejected: each of these is now a command or a check.

### Shared state in the git common dir
- Raised by the reviewer so that state is visible from every worktree while PRs wait.
- Rejected: state outside the branch is invisible in review and history. Gating `start` on the previous merge gives
  one linear state on main; `bun loop status` in the main checkout points at an item in progress elsewhere.

### Triage architecture suggestions (implement the top 1 to 3, backlog the rest)
- Raised by the ERP domain lead and the cost skeptic in the Council, and again by the reviewer: "implement all" is
  unbounded scope, and blind refactors of money code let silent data loss in.
- Not adopted, because the owner asked for every suggestion. The guards are each suggestion's own commit, the
  check after it, one fix round before a revert, and G4 for posting, costing and tax code. Revisit after N2 if
  suggestions keep being reverted.

### Protect the loop's own files with no-mistakes `protected_paths`
- Pros: the owner approves every change to the loop at the gate.
- Cons: the owner already reviews and merges every PR, and a protected-path gate would stop each item that adds a
  check.
- Rejected for now: `learn` records each change, the `state` check enforces it, and the changelog and PR body show
  it.

### Playwright traces for every flow
- Pros: the richest failure evidence.
- Cons: megabytes per flow, in git.
- Rejected: a screenshot, a video and the console and API errors in `results.json` cover the failures seen so far.

## Consequences
- Items take longer in wall-clock terms because slices run one after another; the bet, as in the guide, is less
  rework.
- One item at a time end to end: the next item waits for the owner's merge. N2 runs with its production steps
  (secrets, the first dump, alerts) listed as owner steps.
- The repo gains a CI workflow, a project hook and about 1,000 lines of loop tooling with its own tests.
- Evidence (logs, screenshots, short webm videos) is committed per item, at most 20 media flows per e2e run.
- CodeRabbit's free tier allows about 2 reviews per window, so many items will end at "rate-limited", recorded with
  the head SHA.
- Each item adds an HTML architecture report under `docs/reports/architecture/`.
