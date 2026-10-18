# Handoff — Accurate Daftar Laporan reverse-engineering

Date: 2026-10-18. Goal: every Accurate report reproduced by the ERP at zero diff, with `docs/reports/<planId>.md` + fixture + test.

## Status

- **169 / 229 verified** (18 out of scope, ADR-0010) (zero-diff test against an Accurate fixture). 82 at "spec" (params/layout captured only). Index: `docs/reports/README.md`.
- `apps/api`: 193/193 `bun test` pass, typecheck clean, everything pushed to `main`.
- ADRs 0001–0009 in `docs/decisions/` (ES ledger, hand-rolled store, report rules, Account aggregate, documents post via ledger, FIFO, fixed assets/month-end, returns, PPN on sales invoices).
- Fokus Keuangan: unverified (Modal Kerja `%` does not reconcile).

## Sandbox state (Accurate, Data Usaha = `SANDBOX_DB_NAME`)

- Fixture data all prefixed `NL-T*`, dated 2030–2035 (outside real data). Each fixture file in `docs/reports/fixtures/` lists its documents and the window.
- Preferensi changed: Anggaran dan Target **enabled** (`tools/accurate/set-pref.mjs featureBudgetTarget true`); multi-warehouse, sales quote/order, invoice exchange, employee loans **enabled**. Manufacturing would not stay on (likely paid).
- Leftovers: empty stock-opname order `OPO.00002`; warehouse `NL-Gudang B`.

## Tooling (in repo: `tools/accurate/`, see its README)

Rebuilt and committed 2026-10-18 after the scratchpad copy was lost. `report.mjs`, `call.mjs`, `capture-save.mjs` (serialize an existing record with the form's own submit, request aborted), `save-inv.mjs` (`KIND=si|pi`), `save-item.mjs`. Captured wire templates (`si-wire.json`, `pi-wire.json`, `item-wire.json`) are gitignored; recreate with `capture-save.mjs`. `selectedBranch` must be `[{"id":50}]` (an empty array returns no rows).

## Next steps

1. **Tax**: Keluaran, Masukan and Rekonsiliasi verified (T19). PPN needs the item's default tax (`tax1Id`); item `NL-T19-S1` (id 301) has PPN 11%. Purchase invoices save only via `bg-save-purchase-invoice.do` (background job, polled); `save-purchase-invoice.do` errors. SPT Masa lists verified: rows appear only after an SPT PPN/PPNBM is saved (`tools/accurate/spt-masa.mjs <from> <to> save`); an SPT for Nov 2035 now exists in the sandbox. Customer `NL-T19-C1` (id 452) is PKP.
2. UI-capture-first items: bank reconciliation / post-dated cheques, loan installment schedule, stock opname (order lists don't save via script), serial numbers, price/discount adjustments, sales targets, installments.
3. Remaining charts/projections: export PNG (`EXPORT=xls`), transcribe labels into `fixtures/charts.json`.
4. Scope decided (ADR-0010): payroll, job orders, manufacturing, activity log/users/access (18 reports) are out of scope. CSV download reports (4) return files, not tables.

## Gotchas

- `rtk` wraps `git` in this shell and truncates long output: use `rtk proxy git show ... > file` when capturing file contents.
- Python helpers that append to a file must read before opening for write (an `open(p,'w').write(open(p).read()...)` one-liner truncates the file first).

- Fixture tests replay earlier fixtures in order (FIFO/opening balances depend on it); see `apps/api/test/fixture-db.ts` and per-test `beforeAll`.
- Accurate quirks recorded per report doc (e.g. "Agt" in row dates vs "Agu" in headers, English months in "Saldo per" labels, Umur in Tukar Faktur vs today).
- User's own uncommitted WIP in `pnpm-workspace.yaml`, `apps/web/package.json`: do not commit.
