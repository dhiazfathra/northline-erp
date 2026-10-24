# ADR-0049: The web app checks the session before every screen and signs out on the server; screens move off mock() in a fixed order

## Status
Proposed (2026-10-22), awaiting the owner's review.

## Date
2026-10-22

## Context
Strategy item N1 ([strategy README](../strategy/README.md), H0) is to wire the web UI to the API. The customer guide
(`docs/guide/northline-user-guide.html`) found that only sign-in and five data calls reach the API; every other
screen reads `mock()` sample data. It also found two session defects:

- **Keluar did not sign out.** Both sign-out buttons only navigated to `/auth`. The `nl_session` cookie and its
  server row stayed valid for up to 7 days, so anyone using the same browser afterwards was still signed in.
- **No screen checked the session.** A signed-out visitor saw the whole shell with sample data. The API refused
  their data calls (401), but nothing sent them to sign-in.

## Decision
- **Sign-out ends the session on the server.** `useSignOut` (`apps/web/src/api/session.ts`) calls
  `POST /api/auth/logout`, which deletes the session row and the cookie. It then clears the React Query cache, so
  the next user of the browser cannot see cached data, and goes to `/auth`. If the logout call fails, it still
  clears the cache and leaves.
- **The root route checks the session.** `beforeLoad` in `apps/web/src/routes/__root.tsx` fetches `GET /api/me`
  through the query cache (60 s stale time) before every screen except `/auth`, and redirects to `/auth` when it
  answers 401. The API's `requireSession` stays the real control; the guard only stops the shell rendering for a
  signed-out visitor.
- **Screens leave `mock()` in this order:** reports (the 180 reports with an endpoint), then documents, then
  accounts, fixed assets and the overview. Each step swaps `mock()` for the `api` client and reruns the PLAN.md
  Playwright flows against a seeded local API. N1 is done when only `workspaces.ts` and `ai.ts` call `mock()`.
- **Reports (step 1, 2026-10-22).** The 14 catalog reports call the API (`fetchReport` in `apps/web/src/api/reports.ts`).
  Neraca and Laba/Rugi keep the statement layout: the API's `{label, amount, kind}` rows become `ReportRow`s and a
  second call fills the comparison column. The other 12 answer Accurate's grid (`string[][]`) and render as a plain
  table, without the layout editor. Rekap PPN needed a route: `GET /api/reports/tax/ppn/{in-out|out|in}`
  (TaxationOutReport, TaxationInReport, TaxationInOutReport). Drill-down, favourites, branch and currency stay on
  sample data until their endpoints exist.
- **Documents, accounts, fixed assets and the overview (steps 2 to 5, 2026-10-24).** Every screen except the
  workspace switcher and the AI panel now reads and writes the API; `rg -c 'mock\(' apps/web/src/api` finds only
  `workspaces.ts` and `ai.ts`. Screen-shaped reads live under `apps/api/src/web/` (`/api/web/docs/*`,
  `/api/web/reports/*`, `/api/web/overview`, `/api/web/modules/*`, `/api/ledger/*`, `/api/fixed-assets/*`) and every
  write goes through the existing command routes and services, so posting rules stay in one place. These sub-apps
  are mounted outside the typed `AppType` chain (it hit TS2589) and the web calls them with plain `fetch`.
  Migrations 0064 to 0067 add what the screens needed and nothing held: per-user report favourites and layouts,
  feature switches and default accounts, fixed-asset details plus the Pengeluaran Aset document, and account details.
- **A form field the API cannot hold is disabled or refused, never dropped.** Examples: opening balance (enter it as
  a journal), currency revaluation at month-end, tax-inclusive prices, payment discounts, invoice discounts without a
  discount account, edits to quotations and orders (create only), fixed-asset attachments,
  edits to stock adjustments with OUT lines or a non-default offset account, edits to sales receipts with PPh. Each is refused with 409
  or hidden in the form, with a one-line reason.
  Each document type's form shows only the header fields its service stores (`storedInfo` in
  `packages/schemas/src/docs.ts`); the API refuses an unstored discount, tax flag or PO number with 409, and ignores payment terms.

## Alternatives Considered

### Check the session only when an API call returns 401
- Pros: no extra request per navigation.
- Cons: most screens make no API call yet, so a signed-out visitor would still see the shell.
- Rejected: wrong until N1 is finished.

### Keep the guard in each feature route
- Pros: screens could opt out.
- Cons: every new route has to remember it.
- Rejected: one check in the root route covers every route, including future ones.

## Consequences
- Every first navigation costs one `GET /api/me`; the query cache absorbs repeats for 60 s.
- A session that expires while the app is open is noticed at most 60 s later, on the next navigation.
- The customer guide no longer warns that sign-out keeps the session.
- The overview's "new transaction" quick form opens the full document form instead of creating anything; KPI deltas
  and sparklines show a flat baseline until a time-series query exists.
- Each refused field above is a backlog item, not a silent gap.
