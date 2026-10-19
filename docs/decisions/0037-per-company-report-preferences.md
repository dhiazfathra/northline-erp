# ADR-0037: Per-company report preferences (aging basis, P&L style)

## Status
Accepted

## Date
2026-10-19

## Context
Two report behaviours differ by Data Usaha, and both were reachable only by passing parameters:
- **Aging basis.** Trade Portal and Kontraktor Demo age open invoices from the invoice date; Manufaktur and Retail
  Demo from the due date (ADR-0029 finding 7, ADR-0035 finding 7). `openInvoices` supported both, but every HTTP
  route used the due date, so the trade and contractor branches (ADR-0036) printed wrong age buckets.
- **P&L style.** Kontraktor's project P&L prints one `LABA BERSIH` with id-ID numbers; Retail prints before/after tax
  with en-US numbers (ADR-0035 finding 2). Routes defaulted to Retail unless the caller added `style=standard`.

## Decision
Store both on the company, next to the costing method (ADR-0031 steps 1-2):
- Migration 0051 adds `ledger_settings.aging_basis` (`DUE_DATE` default, `INVOICE_DATE`) and `report_style`
  (`RETAIL` default, `STANDARD`).
- Routes read them: Umur Piutang / Umur Utang (summary and detail) and the AR/AP aging charts use `aging_basis`; the
  dimension P&L routes use `report_style`. Query parameters `basis=` and `style=standard|retail` still override.
- `GET` / `PUT /api/settings/report-preferences`; a change is logged as `PRF` (Preferensi). Unlike the costing method,
  neither preference touches the ledger, so both can change at any time.
- Seeds set Trade Portal to `INVOICE_DATE` / `RETAIL` and Kontraktor to `INVOICE_DATE` / `STANDARD` on every run, so
  existing production branches gain them. Manufaktur and Retail keep the defaults.
- The receivables report route now accepts every report its handler maps (aging, aging-detail and the rest were
  unreachable before).

## Alternatives Considered
- **Keep query parameters, have the web UI pass them per profile**: rejected; the UI would need to know the profile,
  and API callers would still get the wrong default.
- **Wait for business profiles (ADR-0031 steps 3-5)**: rejected; the aging gap gives wrong numbers today. A profile
  can later set these columns as part of its template.

## Consequences
- Outstanding reports' `Umur (hr)` column still counts from the due date; no capture shows otherwise.
- Trade Portal's project P&L style is unverified (no capture); it keeps `RETAIL`.
- No settings screen yet: change via the API.
