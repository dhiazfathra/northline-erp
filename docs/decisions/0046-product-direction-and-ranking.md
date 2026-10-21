# ADR-0046: Product direction: Accurate parity first, Odoo Community breadth second, sold as industry packs and services

## Status
Proposed (2026-10-21), awaiting the owner's review. Plan: [docs/strategy/README.md](../strategy/README.md).

## Date
2026-10-21

## Context
The owner set four long-term goals: feature parity with Accurate Online, feature parity with Odoo Community (latest
stable is 20.0), competing directly with Impact (impactfirst.co: an "AI-native ERP" sold with consulting, 33 products,
14 industries), and proof that Northline can run large enterprises at a known, auditable infrastructure cost.

What exists on 2026-10-21:

- 288 of 291 Accurate reports reproduce Accurate to the cell, and 3 are accepted divergences (ADR-0039). Tier 1 screen
  parity is closed (ADR-0045).
- The API covers ledger, sales, purchasing, inventory, cash and bank, fixed assets, payroll, job costing and contractor
  projects. The web UI reaches the API in 5 of its 43 data calls; the rest return mock data.
- Missing outright: import, printable documents, e-Faktur (Coretax) export, bank and marketplace integration, POS, CRM,
  bills of materials, consolidation, load tests and scheduled backups.
- Odoo 20.0 marks 34 modules as applications. Northline builds 4 of them, covers 5 in part and lacks 25.

The goals compete for one developer working with agents. Without a ranking rule, work drifts to whatever is most
interesting, for example a new module, while the product still cannot be used end to end by a customer.

## Decision
- **Order the goals by go-to-market.** The first buyers are companies leaving Accurate (v1 brief), so Accurate parity
  gates the rest. Next comes Odoo Community breadth. Impact-style industry packs and services run in parallel from
  Q1 2027, because services earn soonest (v3 brief). Enterprise scale work starts only when a benchmark asks for it
  (ADR-0048).
- **Rank work inside a horizon by `2 × Impact − Effort − Ambiguity`.** Each factor is scored 1 to 5, using the scales
  in the plan. A paying co-build (ADR-0033) may pull one item forward.
- **"Parity" has a definition of done.** For Accurate, a company closes a month through the UI alone and the Parallel
  Close diff against Accurate is zero. For Odoo, each of the 34 applications is built, integrated through a documented
  connector, or recorded as an accepted divergence in an ADR. For Impact, every product, industry, service and resource
  they list has a Northline page and offer.
- **Integrate before building for apps outside the ERP core.** That covers website, eCommerce storefront, eLearning,
  live chat, events, email and SMS marketing, surveys and lunch. They are delivered through the public API and webhooks
  first, and built only when a customer pays for them.

## Alternatives Considered

### Breadth first: clone Odoo's app list before finishing the UI
- Pros: the feature checklist grows fastest
- Cons: nothing is sellable until the UI runs on the API, and Odoo breadth without Accurate-grade numbers is just
  another Odoo
- Rejected: the evidence base (288 zero-diff reports) is the differentiator, and it is invisible to buyers today

### Build on Odoo Community, the way implementers like Impact appear to
- Pros: 34 applications on day one
- Cons: discards the event-sourced ledger and the verified reports, and puts us in the same price race as every
  Odoo partner
- Rejected: Northline would lose its only proof point and its ownership of the core (ADR-0033)

### Rank by impact alone
- Rejected: it lets high-ambiguity items such as marketplace connectors and e-Meterai crowd out clear work that is
  ready to build

## Consequences
- The next eight weeks go to work that customers touch: wiring the UI to the API, import, printing, Coretax export,
  backups, tenant routing and Parallel Close. No new modules start in that window.
- The parity matrix ([docs/strategy/parity-matrix.md](../strategy/parity-matrix.md)) is the backlog's source. Any
  change in parity status updates it in the same commit.
- 25 Odoo applications start as gaps. About half are expected to close through integration rather than code, and
  each one closed that way needs a connector doc or an ADR.
- The plan is re-scored when a horizon closes, or when a customer co-build changes the order.
