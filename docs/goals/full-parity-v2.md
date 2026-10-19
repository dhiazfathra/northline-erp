# Goal: full parity with Accurate (reports, modules, screens), v2

Supersedes [full-parity.md](full-parity.md). Paste the block below as a `/goal`. Tax *integrations* (e-Faktur, Coretax,
e-Bupot upload, e-SPT export) and bank integrations stay out; tax *calculations and reports* are in.

## What changed from v1 (red-team cross-check, 2026-10-19)

| # | v1 problem | v2 fix |
|---|------------|--------|
| 1 | P4 "every menu entry of every demo" is unbounded: no count, no priority, no budget. It would swallow the goal. | P4 starts with a count and a tiering; only Tier 1 (forms that post journal/stock) is in this goal's done line. |
| 2 | P3.2 "enforced on every route" is a cross-cutting auth rewrite hidden inside a report group. One mistake breaks every existing test. | Split: report parity in P3; route enforcement is its own phase (P4) with a default-allow migration and a deny matrix test. |
| 3 | No phase order, no checkpoints, no stop rule. A /goal this size drifts. | Explicit order, a checkpoint commit + `_coverage.md` update per phase, stop-and-report rules. |
| 4 | Report name wrong: "Distorsi Gaji". | It is **Porsi Gaji Karyawan** (`EmployeeSalaryProportionReport`). |
| 5 | P2 reads as greenfield, but `apps/api/test/contractor-projects.test.ts` + `fixtures/contractor/projects-k.json` already verify 5 Kontraktor reports (ADR-0035). | P2 extends that module, fixture and test; no parallel module. |
| 6 | Same year (2048) for P2 and P5.2 in the same Kontraktor sandbox; seeds collide. | Year per phase (table below). |
| 7 | `_coverage.md` header still says "275 reports, 275 done" while the table has 291 rows. | Fix header in P0; done line counts rows by script, not by hand. |
| 8 | P3 says "supersede ADR-0010" but ADR-0014 (PPh) and ADR-0016 (COGS monitoring) extend it; they would be left dangling. | One ADR supersedes 0010, 0014, 0016 for the 23 reports; ADR-0015 (bank integration) stays. |
| 9 | 8px CSS blur on text is weak redaction (large fonts stay legible) and "assert blurred" was not defined. | Replace header/email/IP with a solid mask (`visibility:hidden` + overlay); assert via computed style before every capture; failed assert aborts the capture. |
| 10 | Videos of every scenario on both sides: big token and time cost, low review value. | Video only for P4 Tier 1 scenarios with a divergence; screenshots otherwise. |
| 11 | ADR-0034 is accepted in P1 while its open questions are answered only in P2. | ADR-0034 accepted with the open questions listed as "resolved in ADR-0038"; ADR-0038 records the answer. |
| 12 | Kontraktor "11 blocked" was the only count stated; P3 group counts were not checked against `_coverage.md`. | Verified: 11 blocked (Proyek Kontraktor) + 23 out of scope = 34 rows to close; groups below sum to 23. |

Smaller option, if this is too much for one goal: run P0 to P3 now (reports to 291/291) and P4 to P6 as a second goal.

---

```
/documentation-and-adrs Reach report parity (291/291) and Tier 1 screen parity with Accurate's four allowlisted demos,
with evidence. Spec: docs/goals/full-parity-v2.md. Work the phases in order; checkpoint after each.

## Guardrails
- Credentials and Data Usaha names from .env only (ACCURATE_USER, ACCURATE_PASS, SANDBOX_DB_NAME,
  RETAIL_/TRADE_PORTAL_/CONTRACTOR_SANDBOX_DB_NAME). Never log, print, screenshot, record or commit them.
- Allowlist: Manufaktur Demo, Retail Demo, Trade Portal Demo, Kontraktor Demo. assertSandbox before every action.
  Seed years: P2 Kontraktor 2048, P3 Manufaktur 2049, P3 payroll/PPh 2050, P4 scenarios 2051, P6.2 Kontraktor 2052.
  Never edit or delete a record you did not create in that year.
- Accurate captures: mask (not blur) the header (Data Usaha name, user menu) and any email/IP; assert the mask by
  computed style before each screenshot/video frame; abort the capture if the assert fails.
- Secret scan on the staged diff before every commit. Personal repo: commit small, push to main after each verified step.
- ERP side runs on a local seeded instance (`NL_PROFILE=<profile> bun apps/api/scripts/seed.ts`). Prod is read-only,
  only in P6.1.

## Stop rules
- Stop and report (do not work around) when: a sandbox is not on the allowlist, a capture needs a form shape not
  found after 3 attempts, a phase exceeds 2x its estimate, or a fix would change a `done` report's output.
- After each phase: all tests green, typecheck clean, `_coverage.md` updated, one checkpoint commit `goal(parity): Pn`.

## Token budget rules
- Reuse tools/accurate (session.mjs, report.mjs, forms.mjs, capture-save.mjs) and the existing fixture/test pattern;
  no new frameworks.
- Delegate mechanical legs (bulk captures, fixture extraction, form inventory rows) to a HIGH/MEDIUM-rung subagent
  with an escalation clause; keep design and diffs on the main loop.
- One fixture file and one test file per module per sandbox. Diff output: only mismatching rows.
- Read a spec .md only when building its report. Do not re-capture what docs/reports/captures already holds.

## P0. Baseline
Fix the `_coverage.md` header totals; add a script (or test) that counts rows by status so the done line is
mechanical. Expected today: 291 rows, 11 blocked, 23 out of scope.
Done when: the count script prints those numbers and runs in CI/test.

## P1. ADR-0034 (decision)
Mark ADR-0034 Accepted (date, "accepted via docs/goals/full-parity-v2.md"). Its open questions (receipts 196.066.600
vs invoices 170.778.000; RAB 196.093.260 vs plan 170.778.000) move to ADR-0038 (Contractor Projects design), answered
by tracing PRC.2026.06.00001's source documents in P2.
Done when: ADR-0034 Accepted, README index updated.

## P2. Contractor Projects (extend the existing module; ADR-0034 order)
Extend apps/api's contractor-projects code, fixtures/contractor/projects-k.json and
apps/api/test/contractor-projects.test.ts. Do not regress its 5 verified reports.
1. Project master gaps (manager, dates, warehouse, account 110506) + project link on purchase invoice, payment,
   receipt and sales invoice lines (sales invoice marks RAB tasks Tertagih).
2. RAB: section > task > item/cost line, unit, planned qty and cost.
3. Material/equipment usage (MEQ): stock out of the project warehouse into project-in-progress at cost.
4. Project completion (FPC): close project-in-progress to COGS/revenue, return leftover stock.
5. Survey/progress per RAB task.
Verify: seed NL-K2 through all five in Kontraktor Demo (2048), capture the 11 blocked reports (for Laba/Rugi Proyek
Kontraktor, get selectedContractorProject's shape by capturing the form's own submit), zero diff.
Done when: 11 rows `done`, ADR-0038 (design + answered open questions), migrations, routes, tests green.

## P3. The 23 out-of-scope reports
One ADR supersedes ADR-0010, ADR-0014 and ADR-0016 for these 23 (ADR-0015 stays). Per group: capture, spec, build,
zero diff. Cheapest first:
1. Job Costing gap (6: Daftar Pekerjaan Pesanan, Daftar/Rincian Penambahan Bahan Baku, Daftar Penyelesaian Pesanan,
   Rincian Barang/Akun Penyelesaian Pesanan). Diff existing createJobOrder + job-costing.test.ts against captures
   first; build only what is missing. Manufaktur Demo.
2. Others (2: Monitoring HPP, Daftar Perintah Pembayaran).
3. Manufacturing (3: Jurnal Perintah Kerja, Penyesuaian Bahan (HPP), Pembelian (HPP)): work orders and production
   cost on top of job costing.
4. Users and access reports (3: Daftar Pengguna per Cabang, Daftar Akses Grup, Daftar Hak Akses per Pengguna): the
   data model (users, groups, per-branch access, privileges) and the reports. Enforcement is P5. Placeholder users.
5. PPh withholding (4: Pembayaran PPh Penjualan/Pembelian, Daftar Bukti Potong PPh Penjualan/Pembelian): PPh on
   receipts and payments, withholding slips. No e-Bupot upload.
6. Payroll (5: Rincian Gaji Karyawan per Bulan/per Tahun, Pajak Penghasilan Karyawan, Porsi Gaji Karyawan, Gaji
   Karyawan per Tahun): payroll runs on top of upsertEmployee/createEmployeeLoan, allowances/deductions, PPh 21 (TER)
   matching Accurate's output. No e-SPT export.
Done when: count script prints 291 done, 0 blocked, 0 out of scope.

## P4. Screen parity, Tier 1
1. Inventory first, build nothing: per demo, list menu entries and forms into docs/parity/_screens.md (module, form,
   Accurate path, ERP route, tier, status). Tier 1 = forms that post journal or stock; Tier 2 = masters/settings;
   Tier 3 = everything else. Report the counts and a per-form estimate; checkpoint.
2. Per Tier 1 form, one scenario script run on both sides with the same inputs: create, edit, delete, one rejected
   save (bad input), resulting journal/stock. Compare field set, defaults, validation message text, numbering,
   journal lines, list/search.
3. Fix the ERP until it passes, or record an accepted divergence with a reason (one ADR may cover several).
Done when: every Tier 1 row is `pass` or `accepted divergence (ADR-n)`; Tier 2/3 rows listed with status `todo`.

## P5. Access enforcement
Enforce P3.4's privileges on API routes. Migration grants every existing user full access (default-allow for current
data), new users default-deny. Test: a route x role matrix generated from the router, asserting 403 for denied and
200 for allowed; all existing tests stay green.
Done when: matrix test covers every route; no route unlisted.

## P6. Remaining proofs
1. Preferensi > Lainnya (report preferences) and Persediaan (costing) checked read-only in a browser on each prod
   branch (screenshot, no writes).
2. Kontraktor Demo costing AVERAGE and aging from INVOICEDATE proven with a seeded purchase and sale (2052).
   Fixture + test; ADR-0035 finding 7 updated to "proven".
Done when: both have evidence and ADR-0035 says proven.

## Evidence (P4, P6, and the final P2/P3 runs)
Per scenario, under docs/parity/<module>/<form>/:
- `README.md`: scenario, inputs, Accurate vs ERP table, verdict (pass / divergence + ADR), date, commit sha, links.
- `run.log`: script stdout (scrubbed by acc.mjs `red`) plus the ERP test output.
- `accurate-<step>.png`, `erp-<step>.png` (masked header on Accurate).
- Video (`recordVideo`) only for scenarios with a divergence; `docs/parity/**/*.webm` in .gitignore, attached to a
  GitHub Release `parity-<phase>` on this private repo; README links the asset.
- docs/parity/README.md: index of scenarios with verdicts, generated by a script from the per-scenario READMEs.

## Deliverables
- ADRs: ADR-0034 accepted; ADR-0038 Contractor Projects; one ADR superseding 0010/0014/0016; divergence ADRs.
- `_coverage.md` 291/291 done (by count script); `_screens.md` Tier 1 all pass/accepted; docs/parity/ evidence tree.
- All tests green, typecheck clean, `pnpm deploy:prod` at the end, smoke on all four branches.
```
