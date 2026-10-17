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

- [x] Theme tokens: dark/light mode (`--fg`, `--ink`, `--paper`, `--card`, background gradient), Outfit font, Phosphor icons, glass scrollbars, keyframes
- [x] Header: Northline logo (3×3 dots), ledger label, current workspace link, mode toggle, ID/EN toggle, "All modules" button, avatar + profile menu (switch workspace, sign out)
- [x] Browser-style tab bar: open tabs (dot, label, dirty "● edit", close, middle-click close), "+" opens mega menu, refresh button (spinner + loader + row fade), tab-count menu (open tabs list, close others, close all)
- [x] Mega menu overlay (all modules, grouped)
- [x] Global search overlay (search modules/pages, no-match state)
- [x] Toast
- [x] Responsive: mobile / tablet / desktop breakpoints (`isMobile`, `notMobile`, `isDesktop`)

## Screens (one route each)

- [x] `/` Overview: quick-action chips, "+" new, KPI cards with dot-matrix charts + delta badge + pager, gradient review cards, module groups with search + "view all"
- [x] `/modules/$moduleId` Module list: filter chips, new button, table (desktop) / list (mobile), status pills
- [x] `/docs/$docType` Transaction document: sub-tabs (list + open forms, closable), filter chips, search input, table/list; "new" form (party, date, auto number toggle, item detail grid, add/remove items, empty state, subtotal/discount/total, save/cancel)
- [x] `/ledger/trial-balance` Neraca Percobaan: grouped debit/credit columns, totals, balanced indicator
- [x] `/cash-bank/reconciliation` Rekonsiliasi Bank: bank dropdown, date range, refresh, hint state, book entries with present/confirm, statement panel, matched list, empty state
- [x] `/ledger/month-end` Proses Akhir Bulan: tabs (new/list), month/year dropdowns, exchange rate input, early-close confirm, generated journal preview, save; history list
- [x] `/settings/preferences` Preferensi: vertical tabs, feature switches with locked notes + cost, default accounts grid, other-tab placeholder, save
- [x] `/asset-modules` Asset module list, `/asset-modules/new` form, `/asset-modules/by-location` report
- [x] `/ai/history` AI chat history: search, list, continue/delete, empty state
- [x] `/fixed-assets` Fixed asset list; `/fixed-assets/new`, `/fixed-assets/$assetId` form (general / expense / other sections, read-only vs edit, auto vs manual depreciation, attachments, process menu, more menu)
- [x] `/accounts` Chart of accounts list (tree, empty); `/accounts/new`, `/accounts/$accountId` form (general, sub-accounts, opening balance, users sections; bank fields)
- [x] `/reports` Report list: category sidebar, search, report cards
- [x] `/reports/$reportId` Report view: toolbar (back, zoom in/out, export, AI), paper preview with loading, parameters dialog, edit layout dialog (tabs), AI analysis panel (chat, history, feedback)
- [x] `/workspaces` Switch tenant: current, list/grid, search, invites (accept/decline), empty
- [x] `/workspaces/new` Create tenant form (name, alias, type, industry, employees, logo)
- [x] `/auth` Sign in (fields, password toggle, strength meter)

## Dialogs & flows

- [x] Drawer (record detail)
- [x] Generic modal (new transaction: counterparty, amount, due)
- [x] Confirm dialogs: unsaved changes (close without saving), delete ("Ya, hapus"), process error, journal detail, activate
- [x] Forms validated with Zod schemas from `@northline/schemas`

## Verification

- [x] `pnpm typecheck`, `pnpm lint`, `pnpm build` clean
- [x] Every route opened and screenshotted in a browser, compared with the design
- [x] Every flow clicked through
- [x] Everything pushed to `main`

## Verification log (2026-10-18)

- `pnpm typecheck`, `pnpm lint`, `pnpm build`: clean.
- 20 routes screenshotted at 1440 and 390 (dark) plus 5 in light mode: no console errors.
- Scripted click-through (Playwright), 12/12 pass: mega menu → page + tab, ⌘K search, ID/EN toggle,
  doc form add item + dirty tab + save, dirty-tab close confirm, trial-balance journal dialog +
  required error, overview new-transaction modal → toast, report params → view → AI panel,
  workspace switch, fixed-asset validation, account row → form, AI-history delete confirm.

## Known deviations (script missing from the design file)

- Mock data, ID/EN copy and responsive values (column ratios, font sizes, card heights) are inferred.
- Auth screen past the password field is inferred; no strength meter on sign-in.
- Asset-module date field is a plain input; fixed-asset Edit lives in the "more" menu.
- Behaviour-less template elements stay inert (overview lower tabs, doc row click, default-account fields).

## Phase 2 · Flow Boards + Changes Board alignment

Spec transcribed in `docs/design-boards.md`; data from one fixture ledger, `packages/schemas/src/fixtures.ts`.

- [x] S0–S8 fixture ledger with tests against board figures (P&L -6,870,000; Neraca 17,284,050 = 954,050 + 16,330,000; kas akhir 14,514,050; TB 35,304,050 / S0+S1+S3 19,444,050)
- [x] Launcher: 10 rail modules, Manufaktur replaces Aset Tetap module; locked tiles follow Preferensi switches
- [x] Dashboard KPIs from fixtures (7,255,000 · 1,400,000 · 5,755,000 · 750,000), deltas "—"
- [x] Master data (Pelanggan, Pemasok, Barang & Jasa, Pajak) seeded from fixtures
- [x] Akun Perkiraan: roll-ups, contra "-", bank panel only for Kas & Bank, journal lines per account
- [x] Jurnal Umum: action rail, Selisih + blocking message, one side per line, Detail Akun editor, Ctrl+S, auto-number
- [x] Faktur Penjualan (PPN footer, Info lainnya, Uang Muka panel), Faktur Pembelian, Penerimaan/Pembayaran (PPh 23, open invoices), Retur Pembelian (Ambil)
- [x] Lists: newest first, source tags, search on Enter, row count, 20-row paging + infinite scroll
- [x] Feedback: problem dialog "<Label> harus diisi", delete confirm + paid-invoice refusal, toasts
- [x] Neraca Percobaan (Saldo Awal / Perubahan / Saldo Akhir), Rekonsiliasi Bank, Proses Akhir Bulan (JV.2026.10.00024), Preferensi (one-way warning)
- [x] Reports: 16 groups, empty/no-results states, Laba/Rugi, Neraca, Arus Kas from fixtures, drill-down to journal lines
- [x] S7 fixed asset Laptop Uji with its journal history

Verification (2026-10-18): typecheck, lint, build, 4 fixture tests clean; 18/18 scripted flows pass with no page errors; reworked screens checked at 390 and in light mode.

Known deviations: customer/vendor balances show "—" (fixture journals carry no party); Barang B remaining stock copied from the board; FX loss posts to 720102 (no loss account in fixtures); seeded documents' item lines are hand-written; cash flow assumes asset disposal had no proceeds.
