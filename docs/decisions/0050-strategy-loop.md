# ADR-0050: One agent loop works the strategy backlog item by item, gated by evals

## Status
Proposed (2026-10-24), awaiting the owner's review. Nothing in this ADR has been run yet.

## Date
2026-10-24

## Context
[docs/strategy/README.md](../strategy/README.md) ranks work as N1, N2, … with a "done when" column. N1 was
delivered in PR #3 by a coordinator plus six subagents ([retro](../retro/2026-10-24-n1.md)). It worked, but most
of the rework came from the orchestration itself: parallel writers collided on the migration sequence and on
`app.ts`, rules had to be relayed between agents, and 3 of 4 slices needed a second round for silent data loss.

Anthropic's guide "When to fold subagents into your main agent loop" (2026-10-22) recommends one model, one
context and one tool loop by default. Procedures go in skills, hard limits in tools, and the model writes and
revises its own plan. Subagents are kept only for measured context bloat, disposable parallel work or tool
overload. Evals come before refactoring: 10 golden examples, each run more than once.

A quick Council (harness architect, ERP domain lead, eval engineer, cost skeptic) agreed on the points below.
Where it disagreed is recorded under Alternatives.

## Decision
- **One main loop, one item at a time.** The `strategy-loop` skill (`.claude/skills/strategy-loop/`) runs one
  backlog item per iteration, in score order, in its own worktree. Slices are built one after another in the main
  context. The run state and plan live in `docs/strategy/loop/STATE.md`, which the agent writes and revises.
- **Two subagents, no more.**
  - The **e2e verifier**: it runs the Playwright flows against a seeded local API without having seen the
    implementation. In N1 it was the only orchestration with a measured payoff (5 bugs that unit tests missed).
  - **Read-only exploration**, only when the main context is past about 60% before building starts.
  - No subagent writes code in parallel with another writer.
- **Hard limits are tools, not prose.** Phase 0 builds them before any item runs:
  - `tools/loop/next-migration.ts` claims the next migration number.
  - `tools/loop/check.ts` runs typecheck, lint, tests, the duplicate-migration check and the `mock()` count.
  - A CI workflow runs the same check on every push.
  - `tools/loop/pr-body.ts` keeps the PR body between `<!-- loop:begin -->` and `<!-- loop:end -->` markers and
    appends the no-mistakes description below them.
- **Evals first.** The 10 golden cases in `.claude/skills/strategy-loop/evals/golden.md` run before and after
  each item. An item passes only when every case passes twice in a row (pass^2).
- **Per-item gate:** e2e → PR → `/no-mistakes` → append its description → CodeRabbit until it approves or
  rate-limits (at most 2 rounds) → `/improve-codebase-architecture`, with the report saved as
  `docs/reports/architecture/<item>.html` → implement every suggestion → evals pass^2 again.
- **Architecture suggestions:** the owner asked for all of them to be implemented. Each one lands as its own
  commit and must keep the evals green. A suggestion that breaks an eval and cannot be fixed within one round is
  reverted and logged in STATE.md with the failing case. Suggestions that touch posting, costing or tax code
  also need the Accurate zero-diff suite to stay green.
- **Self-improvement needs a failing case.** After each item, `/retro` runs. A change to the skill, a prompt or
  a tool lands only together with the eval case or check that would have caught the problem. Each item adds at
  most 2 changes. Nothing is added to a prompt "just in case".
- **Stop and ask the owner** when an item needs an owner decision (Ambiguity 5, or N3), when the same eval fails
  in 2 rounds, when any ledger or Accurate diff appears, or when a migration would run against a production Neon
  branch.

## Alternatives Considered

### Keep the N1 shape (coordinator plus parallel slice agents)
- Pros: more wall-clock parallelism.
- Cons: the shared files (`app.ts`, `route-privileges.ts`, `db.ts`, migrations) make slices dependent anyway;
  rules got lost between agents; most rework came from this.
- Rejected: N1 measured the cost, and nothing measured a benefit.

### Triage architecture suggestions (implement the top 1 to 3, backlog the rest)
- Raised by the ERP domain lead and the cost skeptic: "implement all" is unbounded scope, and blind refactors of
  money code let silent data loss in.
- Not adopted, because the owner asked for every suggestion. The eval and zero-diff guards above are the
  compromise. Revisit after N2 if suggestions keep being reverted.

### A heavier eval suite before starting
- The eval engineer wants all 10 cases automated before N2. Some (round trip, privilege matrix) need harness work.
- Adopted as phase 0, but bounded: cases that need a missing harness start as e2e flows in `tools/e2e/`.

## Consequences
- Items take longer in wall-clock terms because slices run one after another; the bet, as in the guide, is less
  rework.
- Phase 0 (tools, CI, the golden cases) must land before N2 starts.
- CodeRabbit's free tier allows about 2 reviews per window, so most items will end at "rate limited", which is
  recorded with the unreviewed head SHA.
- Each item adds an HTML architecture report under `docs/reports/architecture/`.
