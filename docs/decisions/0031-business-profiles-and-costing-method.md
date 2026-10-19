# ADR-0031: Business profiles (Manufaktur, Retail, Trade Portal) and configurable costing method

## Status
Proposed. Plan for the principal's review; nothing below is built yet.

## Date
2026-10-19

## Context
The acceptance spec now covers three Accurate sandboxes, and each runs the same Accurate engine with different
company setup:

| Concern | Manufaktur Demo | Retail Demo | Trade Portal Demo |
|---|---|---|---|
| Costing method | FIFO (ADR-0006) | FIFO | **Average** (NL-TP-S1: 15 sold from 10 @ 100.000 + 10 @ 120.000 cost 1.650.000; FIFO would be 1.600.000) |
| Daftar Laporan | 248 reports | 275 (adds branch, department, project, budget, salesman reports) | 266 (no department/project/currency reports) |
| Chart of accounts | dotted, sandbox-specific | `111.101-02` dotted | flat numeric (`1101` > `110102`) |
| Dimensions | none in use | branch, department, project | single branch (Pusat) |
| Modules in use | job costing, roll-over, fixed assets, payroll | salesmen, commissions, targets, budgets, approvals | warehouse stock, price/discount adjustments, payment gateway (Xendit) accounts |
| Aging basis (Umur Piutang/Utang) | due date | due date | **invoice date** (ADR-0029 finding 7) |
| Report parameters | lenient | lenient | strict (ADR-0029) |

The ERP has one hardcoded behavior for each concern. FIFO lives in `apps/api/src/inventory/fifo.ts` and is called
as `fifoCost(layers(moves), qty)` from sales, returns, adjustments and job costing, and `layers` from
`reports/inventory.ts`. Company-level settings are only `ledger_settings` (retained-earnings account, fiscal year
start month).

## Decision (proposed)
Introduce a **business profile**: a company-level preset that sets defaults, plus individual settings that can
still be changed. A profile is a starting point; the settings are what the code reads.

1. **Company settings table.** Extend `ledger_settings` into `company_settings` (one row): `profile`
   (`MANUFAKTUR` | `RETAIL` | `TRADE`), `costing_method` (`FIFO` | `AVERAGE`), `aging_basis` (`DUE_DATE` | `INVOICE_DATE`; the report
   functions already take it), enabled feature flags
   (dimensions, job costing, salesmen, budgets, approvals, multi-warehouse), plus the existing two fields.
   Changing `costing_method` is an event (`CostingMethodChanged`) in the ledger stream so it shows in the audit log.
2. **Costing strategy seam.** Replace direct `fifoCost(layers(...))` calls with one function
   `costOut(method, moves, qty)` in `inventory/costing.ts`, plus `onHand(method, moves)` for the valuation reports.
   `fifo.ts` stays as the FIFO strategy; `average.ts` adds moving average:
   unit cost recomputed on every inbound move = (value on hand + inbound value) / (qty on hand + inbound qty); an
   outbound move costs qty x current unit cost. Rounding (per unit or per line) is an open question to settle against
   Accurate fixtures before coding.
3. **Method is fixed once stock moves exist.** Accurate only allows changing the method with no transactions; we
   copy that (`DomainError` if `stock_moves` is non-empty). This avoids re-costing history and keeps the existing
   "documents in date order" shortcut in `fifo.ts` valid.
4. **Profile presets.** `profiles.ts` maps each profile to defaults (costing method, features, chart-of-accounts
   template, default accounts for new items/customers/vendors). Seeding a new company applies one preset.
5. **Report catalog per profile.** The Daftar Laporan index the UI shows comes from the enabled features
   (e.g. department reports only when the department dimension is on), matching each sandbox's catalog.
6. **Acceptance tests per profile.** Each sandbox's fixtures run under its profile: Manufaktur and Retail tests
   under FIFO (unchanged), Trade Portal tests under AVERAGE. A test helper takes the profile when creating the
   schema (`fixtureDb(name, { profile })`).

## Build order (proposed, for review)
1. `company_settings` migration and `costOut` seam with FIFO only; all 280 tests stay green (pure refactor).
2. Moving-average strategy with unit tests, then the NL-TP trade fixture (purchases, sale) verified zero-diff on
   Laba/Rugi HPP, Profitabilitas per Barang, Nilai Persediaan under `AVERAGE`.
3. Profile presets and feature flags; hide disabled modules' endpoints and reports.
4. Chart-of-accounts templates per profile (from each sandbox's `GlAccountListReport`).
5. UI: profile chosen at company setup; settings page showing the costing method (read-only once stock exists).

## Alternatives Considered
- **Costing method per item** (some ERPs allow it): Accurate sets it per company, and none of the sandboxes needs
  per-item methods. Rejected for now; the `costOut` seam would allow it later.
- **Three separate builds or forks per profile**: triples maintenance, and the three sandboxes share almost all
  rules (ADR-0029 found no calculation-rule differences outside costing). Rejected.
- **Allow switching method with re-costing of history**: more flexible, but it rewrites posted HPP journals and
  Accurate does not do it. Rejected.

## Consequences
- Trade Portal HPP, profitability and inventory valuation reports stay "blocked: requires average costing" in
  `_coverage.md` until step 2 lands.
- Feature flags add a branch to many endpoints; keep them at the router level, not inside report code.
- Open questions: average-cost rounding; whether returns re-enter at the original cost or the current average
  (to settle against Trade Portal fixtures).
