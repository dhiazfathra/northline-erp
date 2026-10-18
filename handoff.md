# Handoff — Accurate Daftar Laporan reverse-engineering

Date: 2026-10-18. Goal: every Accurate report reproduced by the ERP at zero diff, with `docs/reports/<planId>.md` + fixture + test.

## Status

- **148 / 229 verified** (zero-diff test against an Accurate fixture). 82 at "spec" (params/layout captured only). Index: `docs/reports/README.md`.
- `apps/api`: 175/175 `bun test` pass, typecheck clean, everything pushed to `main`.
- ADRs 0001–0009 in `docs/decisions/` (ES ledger, hand-rolled store, report rules, Account aggregate, documents post via ledger, FIFO, fixed assets/month-end, returns, PPN on sales invoices).
- Fokus Keuangan: unverified (Modal Kerja `%` does not reconcile).

## Sandbox state (Accurate, Data Usaha = `SANDBOX_DB_NAME`)

- Fixture data all prefixed `NL-T*`, dated 2030–2035 (outside real data). Each fixture file in `docs/reports/fixtures/` lists its documents and the window.
- Preferensi changed: multi-warehouse, sales quote/order, invoice exchange, employee loans **enabled**. Manufacturing would not stay on (likely paid).
- Leftovers: empty stock-opname order `OPO.00002`; warehouse `NL-Gudang B`.

## Tooling (in repo: `tools/accurate/`, see its README)

Rebuilt and committed 2026-10-18 after the scratchpad copy was lost. `report.mjs`, `call.mjs`, `capture-save.mjs` (serialize an existing record with the form's own submit, request aborted), `save-inv.mjs` (`KIND=si|pi`), `save-item.mjs`. Captured wire templates (`si-wire.json`, `pi-wire.json`, `item-wire.json`) are gitignored; recreate with `capture-save.mjs`. `selectedBranch` must be `[{"id":50}]` (an empty array returns no rows).

## Next steps

1. **Tax**: solved for sales. PPN needs the item's default tax (`tax1Id`); item `NL-T19-S1` (id 301) has PPN 11%. `TaxationOutReport` verified (T19). Still open:
   - **Purchase invoices**: `save-purchase-invoice.do` returns a server error ("Upsss…") even when cloning a known-good NL purchase invoice as-is (ids, optLock, number, journalId, history arrays removed). Next try: capture a *fresh* purchase form (`openModule` without id), set vendor and lines through the form model, then `submitForm` and inspect the request. Unblocks `TaxationInReport`, `PurchaseInvoiceSPTListReport`, `TaxationInOutReport`.
   - SPT lists need an e-Faktur number on the invoice.
2. UI-capture-first items: bank reconciliation / post-dated cheques, loan installment schedule, stock opname (order lists don't save via script), serial numbers, price/discount adjustments, sales targets, installments.
3. Remaining charts/projections: export PNG (`EXPORT=xls`), transcribe labels into `fixtures/charts.json`.
4. Scope decision pending from user: payroll, manufacturing, job orders, audit/users/access (~25 reports) — likely out of reach or out of scope. CSV download reports (4) return files, not tables.

## Gotchas

- Fixture tests replay earlier fixtures in order (FIFO/opening balances depend on it); see `apps/api/test/fixture-db.ts` and per-test `beforeAll`.
- Accurate quirks recorded per report doc (e.g. "Agt" in row dates vs "Agu" in headers, English months in "Saldo per" labels, Umur in Tukar Faktur vs today).
- User's own uncommitted WIP in `pnpm-workspace.yaml`, `apps/web/package.json`: do not commit.
