# P6.1: production Preferensi (read-only)

Checked 2026-10-19 at commit `f05efdf`. The live Worker (https://northline-erp.dhiazfathra.workers.dev) was opened in
headless Chromium (Playwright) and logged in with the principal's existing `NL_EMAIL` / `NL_PASSWORD` from `.env`.
Every non-GET `/api` request except the login was aborted (0 blocked, none attempted), and no form was submitted.
Before each screenshot, any text that holds an email, an IP or a credential was masked black, and the mask was asserted
by computed style. No such text was on either page (0 masked elements). The header shows only the demo company name
and initials.

Expected values come from `apps/api/scripts/seed/<profile>.ts` (ADR-0031, ADR-0036, ADR-0037).

| Branch (profile) | Expected costing / aging / style | Observed (UI and `GET /api/settings/*`) | Verdict | Evidence |
|---|---|---|---|---|
| `production` (Manufaktur) | FIFO / DUE_DATE / RETAIL | FIFO (locked) / DUE_DATE / RETAIL | pass | [Persediaan](production-persediaan.png), [Lainnya](production.png) |
| `prod-retail` (Retail) | FIFO / DUE_DATE / RETAIL | not checked | stopped | - |
| `prod-trade` (Trade Portal) | AVERAGE / INVOICE_DATE / RETAIL | not checked | stopped | - |
| `prod-contractor` (Kontraktor) | AVERAGE / INVOICE_DATE / STANDARD | not checked | stopped | - |

Which branch is live: the observed values match only the `production` seed. `prod-retail` has the same values, so the
values alone do not tell the two apart. The workers.dev deploy points at `production` by default (docs/deploy.md).

## Why three branches are stopped
One Worker serves one branch at a time (ADR-0036). Only `pnpm switch:prod <profile>` makes another branch visible in
the ERP, and that command rewrites the Worker's `DATABASE_URL` secret and redeploys it: a production write. No
read-only route to the other branches' UI exists (no preview URLs, no second Worker). To finish this check, the
principal can approve a switch-and-restore window, or run the other branches' UI locally against their read-only URLs.
