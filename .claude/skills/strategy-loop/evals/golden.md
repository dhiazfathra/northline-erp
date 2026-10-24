# Golden evals

Rendered from `CASES` in `tools/loop/checks.ts` by `bun loop render`; edit the code, not this file. `bun loop evals`
runs the static steps once and the tests and e2e stack twice, each on a fresh local database; a case passes only
when both runs pass (pass^2). Baselines live in `docs/strategy/loop/state.json` and move only through
`bun loop baseline`, which ratchets them in the improving direction. Logs, screenshots and videos land in
`docs/strategy/loop/evidence/<item>/`.

| # | Case | Pass when | Steps | Source |
|---|---|---|---|---|
| G1 | Migrations apply from empty | Every migration file is registered once in `db.ts` under a unique number; a fresh database migrates and seeds | `migrations`, `db`, `seed` | N1: two agents took 0064 |
| G2 | Typecheck and lint | `tsc` clean in api (with `tsconfig.types.json`), web and `tools/loop`; oxlint 0 errors, warnings ≤ `oxlintWarnings` | `typecheck-api`, `typecheck-web`, `typecheck-loop`, `lint-web` | N1: TS2589 in `app.ts` |
| G3 | Round trip, no silent loss | Every e2e flow tagged `[G3]` passes (save, reload, every field equal; or the field is disabled and the API answers 409) and there are ≥ `g3Flows` of them | `e2e` | N1: 3 of 4 slices dropped fields |
| G4 | Accurate parity | `_coverage.md` zero-diff count ≥ `accurateZeroDiff`, and nothing under `docs/reports/` except `architecture/` changed since `origin/main` | `coverage`, `parity` | Strategy scorecard; stop condition |
| G5 | Privilege matrix | `access-enforcement.test.ts` passes (each route reaches its handler with its privilege and answers 403 without it) and the seeded login opens every route (`route …` flows) | `access`, `e2e` | N1: seed login had no privileges |
| G6 | Real data in pickers | Every flow tagged `[G6]` passes (it saves a document with picker options the seeded API returned) and there are ≥ `g6Flows` of them | `e2e` | N1: pickers listed fixture names |
| G7 | Mocks only go down | `mock(` calls in `apps/web/src/api` ≤ `mockCalls` | `mocks` | Strategy scorecard |
| G8 | Books balance | After the e2e run, debits = credits in every month of `journal_lines` | `balance` | ERP invariant |
| G9 | Full test suites | `bun test` in api (on the loop's own database), web and `tools/loop`: 0 failures | `test-api`, `test-web`, `test-loop` | Baseline |
| G10 | PR body survives the gate | The PR body holds the current loop section between the markers; n/a before the PR exists | `pr-body` | N1: no-mistakes overwrote the body |
| G11 | The item's done-when | The plan's done-when command exits 0 (and does not reach production); n/a without a plan | `done-when` | Review round 2: done-when was never run |
| G12 | Promised flows exist | Every flow name in the plan's `evalCases` is an e2e flow that ran and passed; n/a when the plan promises none | `e2e` | Review round 3: promised flows were never checked |

## Adding a case

New G-cases come only from a failure that got past this set or the gate; `bun loop learn --check <case>` records
the change and refuses one without an existing case or step. Flows for an item's forms and pickers are not new
cases: tag them `[G3]` / `[G6]` and run `bun loop baseline` to raise the counts. Past 15 cases, merge the ones that
check the same thing.
