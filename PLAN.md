# Ops Dashboard UI — Plan

Source: `Ops Dashboard v30 Close the gap.dc.html` (claude.ai/design project `31b518e2…`) + `support.js`.

## Source caveat

The design file is larger than the 256 KiB read cap of the design API. The fetched copy holds the
template through the Auth screen's form fields; the trailing `<script data-dc-script>` (state,
i18n strings `L.*`, mock data, handlers) is missing. Copy, mock data and behaviour that lived only
in that script are inferred from the template's bindings and Indonesian/English labels.

## Stack

pnpm monorepo: `apps/web` (Vite + React + TanStack Router file routes + TanStack Query +
shadcn/ui + Tailwind v4 + React Hook Form) and `packages/schemas` (shared Zod schemas + types).
Mock fixtures live behind `apps/web/src/api` query functions so a Hono `hc<AppType>` client can
replace them.

## App shell (every screen)

- [ ] Theme tokens: dark/light mode (`--fg`, `--ink`, `--paper`, `--card`, background gradient), Outfit font, Phosphor icons, glass scrollbars, keyframes
- [ ] Header: Northline logo (3×3 dots), ledger label, current workspace link, mode toggle, ID/EN toggle, "All modules" button, avatar + profile menu (switch workspace, sign out)
- [ ] Browser-style tab bar: open tabs (dot, label, dirty "● edit", close, middle-click close), "+" opens mega menu, refresh button (spinner + loader + row fade), tab-count menu (open tabs list, close others, close all)
- [ ] Mega menu overlay (all modules, grouped)
- [ ] Global search overlay (search modules/pages, no-match state)
- [ ] Toast
- [ ] Responsive: mobile / tablet / desktop breakpoints (`isMobile`, `notMobile`, `isDesktop`)

## Screens (one route each)

- [ ] `/` Overview: quick-action chips, "+" new, KPI cards with dot-matrix charts + delta badge + pager, gradient review cards, module groups with search + "view all"
- [ ] `/modules/$moduleId` Module list: filter chips, new button, table (desktop) / list (mobile), status pills
- [ ] `/docs/$docType` Transaction document: sub-tabs (list + open forms, closable), filter chips, search input, table/list; "new" form (party, date, auto number toggle, item detail grid, add/remove items, empty state, subtotal/discount/total, save/cancel)
- [ ] `/ledger/trial-balance` Neraca Percobaan: grouped debit/credit columns, totals, balanced indicator
- [ ] `/cash-bank/reconciliation` Rekonsiliasi Bank: bank dropdown, date range, refresh, hint state, book entries with present/confirm, statement panel, matched list, empty state
- [ ] `/ledger/month-end` Proses Akhir Bulan: tabs (new/list), month/year dropdowns, exchange rate input, early-close confirm, generated journal preview, save; history list
- [ ] `/settings/preferences` Preferensi: vertical tabs, feature switches with locked notes + cost, default accounts grid, other-tab placeholder, save
- [ ] `/asset-modules` Asset module list, `/asset-modules/new` form, `/asset-modules/by-location` report
- [ ] `/ai/history` AI chat history: search, list, continue/delete, empty state
- [ ] `/fixed-assets` Fixed asset list; `/fixed-assets/new`, `/fixed-assets/$assetId` form (general / expense / other sections, read-only vs edit, auto vs manual depreciation, attachments, process menu, more menu)
- [ ] `/accounts` Chart of accounts list (tree, empty); `/accounts/new`, `/accounts/$accountId` form (general, sub-accounts, opening balance, users sections; bank fields)
- [ ] `/reports` Report list: category sidebar, search, report cards
- [ ] `/reports/$reportId` Report view: toolbar (back, zoom in/out, export, AI), paper preview with loading, parameters dialog, edit layout dialog (tabs), AI analysis panel (chat, history, feedback)
- [ ] `/workspaces` Switch tenant: current, list/grid, search, invites (accept/decline), empty
- [ ] `/workspaces/new` Create tenant form (name, alias, type, industry, employees, logo)
- [ ] `/auth` Sign in (fields, password toggle, strength meter)

## Dialogs & flows

- [ ] Drawer (record detail)
- [ ] Generic modal (new transaction: counterparty, amount, due)
- [ ] Confirm dialogs: unsaved changes (close without saving), delete ("Ya, hapus"), process error, journal detail, activate
- [ ] Forms validated with Zod schemas from `@northline/schemas`

## Verification

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` clean
- [ ] Every route opened and screenshotted in a browser, compared with the design
- [ ] Every flow clicked through
- [ ] Everything pushed to `main`
