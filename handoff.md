# Handoff — Accurate Daftar Laporan reverse-engineering

Date: 2026-10-18. Goal: every Accurate report reproduced by the ERP at zero diff, with `docs/reports/<planId>.md` + fixture + test.

## Status

- **147 / 229 verified** (zero-diff test against an Accurate fixture). 82 at "spec" (params/layout captured only). Index: `docs/reports/README.md`.
- `apps/api`: 172/172 `bun test` pass, typecheck clean, everything pushed to `main`.
- ADRs 0001–0008 in `docs/decisions/` (ES ledger, hand-rolled store, report rules, Account aggregate, documents post via ledger, FIFO, fixed assets/month-end, returns).
- Fokus Keuangan: unverified (Modal Kerja `%` does not reconcile).

## Sandbox state (Accurate, Data Usaha = `SANDBOX_DB_NAME`)

- Fixture data all prefixed `NL-T*`, dated 2030–2035 (outside real data). Each fixture file in `docs/reports/fixtures/` lists its documents and the window.
- Preferensi changed: multi-warehouse, sales quote/order, invoice exchange, employee loans **enabled**. Manufacturing would not stay on (likely paid).
- Leftovers: empty stock-opname order `OPO.00002`; warehouse `NL-Gudang B`.

## Tooling (session scratchpad, not in repo — recreate if lost)

Playwright scripts under the session scratchpad `acc/`: `acc.mjs` (login state, `assertSandbox` guard, `red` scrubber), `report.mjs <planId> '<param json>' <out>` (bg-execute → poll → HTML rows; `EXPORT=xls` for charts), `batch.mjs <GROUPS> <dir>` (all reports of groups, `DATES` override), `s14.mjs` (serialize fresh form via app `populateServerParam` + `_convertToExperimentalJsonParam`, patch bean keys, save), `s15.mjs` (serialize existing record = key template), `call.mjs` (raw `.do` call). Secrets only read from `.env`; scrub before any output/screenshot.

Key facts: report API `bg-execute-report.do` → `company/bg-proc-response.do` → `report-output-html.do` on `acc.reportHost`; saves post `_param` JSON; branch/currency params must be arrays of objects; warnings return `{c:<flag>}` to set and resubmit.

## Next steps

1. **Tax (8 reports)**: script-saved invoices ignore PPN. Save one taxed invoice through the browser UI, capture its `_param`, template from it. Test invoices deleted; sandbox clean.
2. UI-capture-first items: bank reconciliation / post-dated cheques, loan installment schedule, stock opname (order lists don't save via script), serial numbers, price/discount adjustments, sales targets, installments.
3. Remaining charts/projections: export PNG (`EXPORT=xls`), transcribe labels into `fixtures/charts.json`.
4. Scope decision pending from user: payroll, manufacturing, job orders, audit/users/access (~25 reports) — likely out of reach or out of scope. CSV download reports (4) return files, not tables.

## Gotchas

- Fixture tests replay earlier fixtures in order (FIFO/opening balances depend on it); see `apps/api/test/fixture-db.ts` and per-test `beforeAll`.
- Accurate quirks recorded per report doc (e.g. "Agt" in row dates vs "Agu" in headers, English months in "Saldo per" labels, Umur in Tukar Faktur vs today).
- User's own uncommitted WIP in `pnpm-workspace.yaml`, `apps/web/package.json`: do not commit.
