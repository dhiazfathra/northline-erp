# Northline strategic direction

Date: 2026-10-21. Status: Proposed, decisions in [ADR-0046](../decisions/0046-product-direction-and-ranking.md)
(direction), [ADR-0047](../decisions/0047-deployment-tiers.md) (tiers) and
[ADR-0048](../decisions/0048-scale-claims-need-benchmarks.md) (benchmarks).
One-page visual: [northline-strategy.html](northline-strategy.html).

**In one sentence:** make what customers touch real first (UI on the API, import, printing, e-Faktur, backups), prove it
with a zero-diff Parallel Close, then widen from Accurate parity to Odoo Community breadth, sold the way Impact sells
(industry packs plus services), with published prices and published benchmarks.

## Where we are

| Area | State on 2026-10-21 | Evidence |
|---|---|---|
| Accurate reports | 288 of 291 zero-diff, 3 accepted divergences | `bun apps/api/scripts/coverage.ts`, [ADR-0039](../decisions/0039-out-of-scope-reports-reopened.md) |
| Accurate screens | Tier 1 parity closed | [ADR-0045](../decisions/0045-p4-tier1-closure.md) |
| API modules | Ledger, sales, purchasing, inventory (FIFO/average, batches, serials, warehouses), cash & bank, fixed assets, payroll (PPh 21 TER, BPJS, loans), budgets, approvals, job costing, contractor projects, access groups, activity log | `apps/api/src`, 282 test cases in `apps/api/test` |
| Web UI | Every data call reaches the API except the workspace switcher and the AI panel (`workspaces.ts`, `ai.ts`); N1 done 2026-10-24 ([ADR-0049](../decisions/0049-web-session-and-api-wiring.md)) | `rg -c 'mock\(' apps/web/src/api` |
| Production | Free-tier Workers + Neon, one Worker repointed across 4 profile branches, smoke-tested on all 4 | commit `3fd0820`, [ADR-0036](../decisions/0036-one-neon-branch-per-profile.md) |
| Tenancy | One company per database; per-customer instance proposed | [ADR-0032](../decisions/0032-dedicated-instance-per-customer.md) (Proposed) |
| Not built | Import, printable documents, Coretax e-Faktur export, webhooks/API keys, bank and marketplace links, POS, CRM, bills of materials, consolidation, load tests, scheduled backups | code search, [risk R7](../risks.md) |
| Go-to-market | Three briefs (mid-market SaaS, enterprise co-build, AI FDE); no licence file | [docs/business](../business/README.md) |

## The four goals and when each is done

| Goal | Done when | Today |
|---|---|---|
| 1. Accurate parity | A company closes a month through the UI alone, and the Parallel Close diff against Accurate is zero on every report | Reports and Tier 1 screens done; UI wiring, SmartLink equivalents, POS and mobile open |
| 2. Odoo 20.0 Community parity | Each of the 34 apps that 20.0 marks `application: True` is built, integrated through a documented connector, or an accepted divergence | 4 built, 5 partial, 25 gaps ([matrix](parity-matrix.md#2-odoo-200-community)) |
| 3. Compete with Impact | Every product, industry, service and resource on impactfirst.co has a Northline page and offer | 7 of 33 products built, 6 partial; 4 of 14 industries have demo data; services exist only as briefs |
| 4. Enterprise scale, with evidence | Each tier T1 to T4 has a passing benchmark, a drilled runbook and a cost line traced to vendor prices | T0 live; T1 to T4 modelled, not proven ([scale and cost](scale-and-cost.md)) |

## How work is ranked

**Score = 2 × Impact − Effort − Ambiguity**, each scored 1 to 5.

- **Effort** (one developer with agents): 1 is a day or less, 2 up to 3 days, 3 up to 2 weeks, 4 up to 6 weeks, 5 more
  than 6 weeks.
- **Ambiguity**: 1 means a spec or fixtures exist, 3 means outside specs still have to be researched, 5 means an owner or
  market decision is needed first.

Horizons follow the go-to-market: buyers leave Accurate first, so Accurate parity gates the rest. Within a horizon,
work runs in score order. A paying co-build ([ADR-0033](../decisions/0033-core-and-client-extensions.md)) may pull one
item forward.

## H0 · Now: make it sellable (to 2026-12-15, ahead of the v1 brief's first contract by 2027-01-31)

| # | Item | I | E | A | Score | Steps | Done when |
|---|---|---|---|---|---|---|---|
| N1 | Wire the web UI to the API | 5 | 3 | 1 | **6** | Reports first (288 verified endpoints), then documents, accounts, fixed assets, overview: swap each `mock()` for the `api` client (`apps/web/src/api/client.ts`). Rerun the PLAN.md Playwright flows against a seeded local API. | Only `workspaces.ts` and `ai.ts` still call `mock()`; flows pass with no console errors |
| N2 | Backups, restore drill, alerts | 4 | 1 | 1 | **6** | Nightly `pg_dump -Fc` per database to R2 from GitHub Actions (Neon wakes for minutes, no Neon cron); keep 30. Monthly restore into a throwaway Neon branch, then smoke test. Alert on Worker 5xx. | A drill log with the measured restore time; risk R7 closed |
| N4 | Productize Parallel Close | 5 | 2 | 2 | **6** | Point `tools/accurate` capture at a prospect's Data Usaha (written consent, read-only, credentials from env); import their month (N5); run the zero-diff suite; emit an HTML diff report | One run on a non-demo company: zero diff, or every divergence explained |
| N3 | Owner decisions | 4 | 1 | 2 | **5** | Accept or reject ADR-0031 steps 3 to 5, 0032, 0033, 0046 to 0048. Pick a licence (recommended: proprietary, per-contract licence, source escrow for T3 and up) | Every ADR in the index reads Accepted or Rejected |
| N5 | Import from Accurate | 5 | 3 | 2 | **5** | Read Accurate's Excel exports (chart of accounts, customers, vendors, items, warehouses, opening balances, open invoices) and post them through the command handlers, idempotent on the source number | A demo company imports and its Neraca matches Accurate on the cutover date |
| N6 | Tenant routing and provisioning | 4 | 2 | 2 | **4** | One Worker maps hostname to an encrypted tenant registry entry (one Neon project per tenant). Add a `tenant-create` script that creates the project, migrates, seeds the profile and registers the host | Two tenants on one Worker; a test proves a request cannot reach the other tenant's data |
| N7 | Printable documents | 4 | 2 | 2 | **4** | Print-CSS templates for sales invoice, delivery order, purchase order, receipt and payment voucher, with the company header from settings | All five print from the UI, with totals equal to the API's |
| N8 | Coretax e-Faktur export | 5 | 3 | 3 | **4** | Get DJP's Coretax XML import spec; map posted PPN invoices (ADR-0009) to it, using Odoo 20's LGPL `l10n_id_efaktur_coretax` as a field-mapping reference; validate against the XSD; then e-Bupot | An exported file imports into Coretax for a test taxpayer with no errors |
| N9 | Benchmark harness | 4 | 2 | 2 | **4** | Volume generator (`NL_SCALE=t1..t4`) through the command handlers, k6 write and report mixes, one throwaway Neon branch per run (ADR-0048) | T1 and T2 results committed and passing |
| N10 | README status refresh | 2 | 1 | 1 | 2 | Done in this change | — |

## H1 · Next: finish Accurate parity (Q1 2027)

| # | Item | I | E | A | Score |
|---|---|---|---|---|---|
| X1 | Excel/CSV import for invoices and journals | 4 | 2 | 1 | **5** |
| X2 | API keys, plus signed webhooks fed from the existing outbox through Cloudflare Queues | 4 | 2 | 2 | **4** |
| X3 | Bank statement import (BCA, Mandiri, BRI, BNI CSV; MT940), auto-matched by the existing reconciliation | 4 | 3 | 2 | 3 |
| X4 | Runtime business profile and per-company settings (ADR-0031 steps 3 to 5) | 4 | 3 | 2 | 3 |
| X5 | Bills of materials, work orders and production results (closes ADR-0044's 7 Manufaktur forms) | 4 | 3 | 2 | 3 |
| X6 | Installable mobile web app (PWA) for approvals, stock lookup and sales orders (the Accurate Lite equivalent) | 3 | 2 | 2 | 2 |
| X7 | POS: offline PWA, shifts, receipts, QRIS (Accurate POS; Odoo `point_of_sale`) | 4 | 4 | 2 | 2 |
| X8 | Multi-entity consolidation | 4 | 4 | 3 | 1 |
| X9 | Marketplace links (Tokopedia, Shopee) through an aggregator API | 3 | 3 | 3 | 0 |
| X10 | e-Meterai through a licensed tax-application provider (PJAP) | 2 | 2 | 3 | -1 |

## H2 · Odoo Community breadth (Q2 to Q3 2027)

| # | Item | I | E | A | Score |
|---|---|---|---|---|---|
| L1 | CRM: leads, pipeline, activities, then quotation | 4 | 2 | 1 | **5** |
| L2 | HR core: departments, contracts, attendance, time off, all feeding payroll | 4 | 3 | 2 | 3 |
| L3 | Inventory depth: reordering rules, pick-pack-ship, barcode, landed costs | 4 | 3 | 2 | 3 |
| L4 | Project tasks and timesheets, then invoicing | 3 | 2 | 1 | 3 |
| L5 | Employee expense claims | 3 | 2 | 1 | 3 |
| L6 | Maintenance and repair | 2 | 2 | 1 | 1 |
| L7 | Recruitment, skills, fleet | 2 | 2 | 1 | 1 |
| L8 | MRP depth: routings, work centres, master production schedule, scrap | 3 | 4 | 2 | 0 |
| L9 | Discuss, calendar, to-do: integrate Google, Microsoft and WhatsApp first | 2 | 3 | 2 | -1 |
| L10 | Website, eCommerce, eLearning, live chat, events, email/SMS marketing, surveys, marketing card, lunch, data cleaning: integration first (X2), build on paid demand (ADR-0046) | 2 | 5 | 3 | -4 |

## H3 · Impact-grade solutions, services and resources (from Q1 2027, alongside H1)

| # | Item | I | E | A | Score |
|---|---|---|---|---|---|
| S1 | Public price list, with a cost-to-serve page from `tools/cost-model.mjs` (Impact publishes no prices) | 4 | 1 | 2 | **5** |
| S2 | Package the 4 captured profiles (manufacturing, retail, distribution, construction) as industry packs: profile, chart of accounts, report layouts, demo data, acceptance tests | 4 | 2 | 1 | **5** |
| S3 | Services page: diagnostic, Parallel Close migration, implementation, training, support SLA, process and SOP work, analytics (from the v1 to v3 briefs) | 4 | 1 | 2 | **5** |
| S4 | Resources: case studies from Parallel Close runs, guides (ERP, Coretax, warehouse, manufacturing, UMKM), tutorials, status page | 3 | 2 | 1 | 3 |
| S5 | New packs: F&B and central kitchen, pharmacy, textile and garment, clinic, rental, nonprofit, logistics, minimarket, food production | 4 | 3 | 3 | 2 |
| S6 | Omnichannel CRM inbox (WhatsApp Business) | 3 | 3 | 3 | 0 |
| S7 | Supply-chain and plant depth: WMS, TMS, fleet, MES, PLM, QA/CAPA, CMMS, DMS, knowledge base, LMS | 3 | 5 | 3 | -2 |
| S8 | Business directory (legal, CPA, notary, tax consultants) | 1 | 2 | 1 | -1 |

## H4 · Enterprise scale (from Q3 2027, each item gated by a benchmark under ADR-0048)

| # | Item | I | E | A | Score |
|---|---|---|---|---|---|
| E2 | SSO (OIDC, SAML), MFA, audit export | 4 | 2 | 2 | **4** |
| E1 | T3 runtime: Hyperdrive, Queues projector, report reads on a replica, event store partitioned by month | 4 | 3 | 2 | 3 |
| E3 | On-premise package: OCI image of the Bun binary, Postgres with synchronous standby (Patroni), pgBackRest, Podman Quadlet and Helm | 4 | 3 | 2 | 3 |
| E4 | ISO 27001 readiness (Accurate shows a certificate) | 4 | 4 | 3 | 1 |
| E5 | Go port ([hono-to-go.md](../migration/hono-to-go.md)), only if a benchmark shows Bun missing an SLO | 2 | 5 | 2 | -3 |

## Monthly scorecard

| Metric | Now | H0 target | Source |
|---|---|---|---|
| Accurate reports zero-diff | 288 / 291 | hold | `coverage.ts` |
| UI files still on `mock()` | 2 (`workspaces.ts`, `ai.ts`) | 2 | `rg -c 'mock\('` |
| Odoo 20.0 apps built, integrated or accepted | 4 (+5 partial) / 34 | 4 / 34 | parity matrix |
| Impact products built | 7 (+6 partial) / 33 | 7 / 33 | parity matrix |
| Paid tiers with a passing benchmark | 0 / 4 | 2 / 4 | `docs/scale/results/` |
| Parallel Close runs with zero diff | 0 | 1 | N4 reports |

## Map

- [parity-matrix.md](parity-matrix.md): Accurate, Odoo 20.0 Community and Impact, row by row
- [scale-and-cost.md](scale-and-cost.md): tiers, SLOs, the cost model, the on-premise bill of materials, the evidence plan
- [../runbooks/scale-tiers.md](../runbooks/scale-tiers.md): the operating runbook per tier
- [../../tools/cost-model.mjs](../../tools/cost-model.mjs): every price with its source; rerun after any price change
