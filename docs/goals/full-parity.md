# Goal: full parity with Accurate (reports, modules, screens)

Paste the block below as a `/goal`. It closes the five open actions of 2026-10-19: ADR-0034, Contractor Projects, the
23 out-of-scope reports, screen/workflow parity, and the last unproven preferences. Tax *integrations* (e-Faktur,
Coretax, e-Bupot upload) stay out; tax *calculations and reports* are in.

---

```
/documentation-and-adrs Reach full parity with Accurate's four allowlisted demos: every Daftar Laporan report at zero
diff, every module those reports need, and every input screen/workflow, with evidence. Spec: docs/goals/full-parity.md.

## Guardrails (unchanged from earlier goals)
- Credentials and Data Usaha names from .env only (ACCURATE_USER, ACCURATE_PASS, SANDBOX_DB_NAME,
  RETAIL_/TRADE_PORTAL_/CONTRACTOR_SANDBOX_DB_NAME). Never log, print, screenshot, record or commit them.
- Allowlist: Manufaktur Demo, Retail Demo, Trade Portal Demo, Kontraktor Demo. assertSandbox before every action;
  one sandbox per fixture; seed in a year no demo data uses (2048+ for new work).
- Screenshots and videos of Accurate: blur the header (Data Usaha name, user menu) and any email/IP before capture
  (inject CSS `filter: blur(8px)` on those selectors, then assert they are blurred). No real user data in evidence.
- Secret scan on the staged diff before every commit. Personal repo: commit small, push to main after each verified step.

## Token budget rules
- Reuse tools/accurate (session.mjs, report.mjs, forms.mjs, capture-save.mjs) and the existing fixture/test pattern;
  no new frameworks.
- Delegate mechanical legs (bulk captures, fixture extraction, checklist rows) to a HIGH/MEDIUM-rung subagent with an
  escalation clause; keep design and diffs on the main loop.
- One fixture file and one test file per module per sandbox. Diff output: only mismatching rows.
- Read a spec .md only when building its report. Do not re-capture what docs/reports/captures already holds.

## P1. ADR-0034 (decision)
This goal accepts ADR-0034's proposed order as written; mark it Accepted with the date and "accepted via
docs/goals/full-parity.md". Open questions (receipts 196.066.600 vs invoices 170.778.000; RAB 196.093.260 vs plan
170.778.000) are answered in P2 by tracing PRC.2026.06.00001's source documents.
Done when: ADR-0034 Accepted, README index updated.

## P2. Contractor Projects (ADR-0034 steps, in its order)
1. Contractor project master (no, name, customer, manager, dates, warehouse, account 110506) + project link on purchase
   invoice, payment, receipt and sales invoice lines (sales invoice marks RAB tasks Tertagih).
2. RAB: section > task > item/cost line, unit, planned qty and cost.
3. Material/equipment usage (MEQ): stock out of the project warehouse into project-in-progress at cost.
4. Project completion (FPC): close project-in-progress to COGS/revenue, return leftover stock.
5. Survey/progress per RAB task.
Verify: seed an NL-K2 project through all five in Kontraktor Demo (2048), capture the 11 blocked reports (incl. Laba/Rugi
Proyek Kontraktor; find its working selectedContractorProject shape by capturing the form's own submit), zero diff.
Done when: 11 reports `done` in _coverage.md, ADR for the design, migrations, API routes, tests green.

## P3. The 23 out-of-scope reports
Supersede ADR-0010 for these in one ADR. Build per group, cheapest first; each group: capture, spec, build, zero diff.
1. Job Costing gap (6: Pekerjaan Pesanan, Penambahan Bahan Baku, Penyelesaian Pesanan and details). Diff existing
   createJobOrder/job-costing against the captures first; build only what is missing. Manufaktur Demo.
2. Users and access (3: Pengguna per Cabang, Akses Grup, Hak Akses per Pengguna): roles, groups, per-branch access,
   enforced on every route (403 tests), not only reported. Placeholder users in fixtures.
3. PPh withholding (4: Pembayaran PPh Penjualan/Pembelian, Bukti Potong PPh Penjualan/Pembelian): PPh on receipts and
   payments, withholding slips. No e-Bupot upload.
4. Others (2: Monitoring HPP, Daftar Perintah Pembayaran).
5. Manufacturing (3: Jurnal Perintah Kerja, Penyesuaian Bahan HPP, Pembelian HPP): work orders and production cost,
   reusing job costing.
6. Payroll (5: Rincian Gaji per Bulan/Tahun, Pajak Penghasilan Karyawan, Distorsi Gaji, Gaji per Tahun): payroll runs,
   allowances/deductions, PPh 21 (TER) per Accurate's output. No e-SPT export.
Done when: _coverage.md has 0 `out of scope` and 0 `blocked` rows; 291/291 done.

## P4. Screen and workflow parity
1. Inventory: for each demo, list every menu entry and its form (fields, defaults, required, lookups, buttons,
   validations, warnings, print/export). Write docs/parity/_screens.md (one row per form: module, form, Accurate path,
   ERP route, status).
2. Per form, one scenario script run on both sides with the same inputs: create, edit, delete, a rejected save (bad
   input), and the resulting journal/stock effect. Compare: field set, defaults, validation messages (text), numbering,
   resulting journal lines, and list/search behaviour.
3. Fix differences in the ERP until the comparison passes; record accepted divergences with a reason.
Done when: every _screens.md row is `pass` or `accepted divergence (ADR-n)`.

## P5. Remaining proofs
1. Preferensi > Lainnya (report preferences) and Persediaan (costing) checked in a browser on each prod branch.
2. Kontraktor Demo costing AVERAGE and aging from INVOICEDATE proven with a seeded purchase and sale (ADR-0035 finding
   7 says "read from the preferences form, not yet proven"). Fixture + test.
Done when: both have evidence (below) and ADR-0035 finding 7 says proven.

## Evidence (P4 and P5; also the final P2/P3 runs)
Per scenario, under docs/parity/<module>/<form>/:
- `README.md`: scenario, inputs, Accurate vs ERP result table, verdict (pass / divergence + ADR), date, commit sha,
  links to the files below.
- `run.log`: the script's stdout (secrets scrubbed by acc.mjs `red`), plus the ERP test output.
- `accurate-<step>.png`, `erp-<step>.png`: Playwright screenshots at each step (blurred header on Accurate).
- `accurate.webm`, `erp.webm`: Playwright `recordVideo` of the full scenario. Videos are not committed (size): add
  `docs/parity/**/*.webm` to .gitignore and attach them to a GitHub Release `parity-<phase>`; README links the asset.
- docs/parity/README.md: index of all scenarios with verdicts, regenerated by a script from the per-scenario READMEs.
ERP side runs against a local seeded instance (`bun scripts/seed.ts` with the matching NL_PROFILE), never prod data
writes; P5.1 is the only prod check, read-only.

## Deliverables
- ADRs: ADR-0034 accepted, Contractor Projects design, ADR-0010 superseded, one per accepted divergence.
- _coverage.md 291/291 done; docs/parity/_screens.md all pass; docs/parity/ evidence tree; Release assets with videos.
- All tests green, typecheck clean, deployed with `pnpm deploy:prod` at the end, smoke on all four branches.
```
