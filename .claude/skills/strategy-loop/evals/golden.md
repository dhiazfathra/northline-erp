# Golden evals

Run all 10 before and after every item, on a freshly migrated and seeded database. Each run happens twice;
a case passes only when both runs pass (pass^2). Phase 0 automates each case behind `bun tools/loop/evals.ts`;
until a case is automated, its "how" column is the manual command.

| # | Case | Pass when | How (until automated) | Source |
|---|---|---|---|---|
| G1 | Migrations apply from empty | Every file applies; no two files share a number | `bun tools/loop/check.ts` (duplicate check), fresh DB + `bun run seed` | N1: two agents took 0064 |
| G2 | Typecheck and lint | `tsc` clean in api and web, including `tsconfig.types.json`; oxlint warnings not above baseline | `bun tools/loop/check.ts` | N1: TS2589 in `app.ts` |
| G3 | Round trip, no silent loss | For each screen form: save, reload, every field equals what was sent, or the field is disabled and the API answers 409 | e2e flows in `tools/e2e/` (save + reload) | N1: 3 of 4 slices dropped fields |
| G4 | Accurate parity | `coverage.ts` zero-diff count not below baseline (288) | `bun apps/api/scripts/coverage.ts` | Strategy scorecard |
| G5 | Privilege matrix | Every route: 403 without its privilege, 2xx with it; the seeded login can open every screen | `bun test apps/api/test/access-enforcement.test.ts` + e2e route sweep | N1: seed login had no privileges |
| G6 | Real data in pickers | No picker lists a value the API does not have | e2e: create one document of each type with the first picker option | N1: pickers listed fixture names |
| G7 | Mocks only go down | `rg -c 'mock\(' apps/web/src/api` total not above baseline | `bun tools/loop/check.ts` | Strategy scorecard |
| G8 | Books balance | After the e2e run, the trial balance has debit = credit for every period | `GET /api/reports/trial-balance` in the e2e teardown | ERP invariant |
| G9 | Full API suite | `bun test` in `apps/api`: 0 failures | `cd apps/api && bun test` | Baseline |
| G10 | PR body survives the gate | After `/no-mistakes`, the PR body still contains the text between the loop markers | `bun tools/loop/pr-body.ts verify` | N1: no-mistakes overwrote the body |

## Adding a case

Add a case only for a failure that got past this set or the gate, as described in the skill's self-improvement
rule. Keep the set small: when it passes 15, merge cases that check the same thing.
