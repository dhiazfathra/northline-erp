# Northline Enterprise: a tailor-made, AI-native ERP for Indonesian enterprises, priced for what AI made it cost to build

> Founder brief v2, 2026-10-19. Companion page: [`northline-enterprise-brief.html`](northline-enterprise-brief.html).
> The mid-market SaaS version (v1) is in [`../v1-mid-market-saas/`](../v1-mid-market-saas/northline-business-brief.md).
> Figures are sourced or marked as assumptions. USD at an assumed Rp 18,000. Not legal or tax advice.

**How v2 differs from v1:** it doesn't compete with Accurate users on price. It sells fixed-price, tailor-made ERP projects of Rp 290M to Rp 1B and up to enterprises. The business model follows [Impact](https://www.impactfirst.co/): one product catalog across industries, plus consulting services. Two things are added. First, the product is AI-native in how it is built, how it runs and how it is priced. Second, new modules are co-built at a discount when Northline keeps the generic IP and resells it.

## At a glance

| | |
|---|---|
| Project size | Rp 290M–1B+ (~US$16–56K+) per project |
| Recurring | 15–20% of project value per year (support, hosting, agents) |
| First revenue | 75–105 days (paid blueprint, target 31 Jan 2027) |
| First project | ~6 months (target signed with down payment by 30 Apr 2027) |
| Capital in | Rp 50–150M (~US$2.8–8.3K): PT, IP lawyer, model API, partner before the first down payment |
| Difficulty | Very hard |
| Year one | ~Rp 820M collected (~US$46K), ~Rp 610M after delivery cost |
| Ceiling | US$3–8M revenue a year |
| What it demands | Sales 10, Trust 10, Delivery 9, Domain depth 9, Build 5, Capital 5 |
| Up against | HashMicro, Impact, Odoo partners, SAP B1 partners, SAP S/4HANA and Oracle, Dynamics 365 and NetSuite partners, local software houses, in-house IT |

## The pitch

A food group with three PTs, 1,200 staff and a central kitchen has two options today. SAP quotes Rp 2B and 18 months. An Odoo partner will bend their recipes and batches into a generic module. Northline shows them **their own ERP running on their own data in five working days**. It quotes a fixed price after a paid blueprint and goes live in 12–20 weeks. Modules already in the catalog are licensed. New modules are co-built at up to 40% off, because Northline keeps the generic IP and resells it to the next company in that industry.

## Who it's for

Indonesian groups with 200–3,000 staff, often several PTs, whose processes don't fit a package. That means food production and central kitchens, distribution, manufacturing, textile and project-based firms. Budget: Rp 290M to Rp 1B and up.

- **The gap:** packages make you bend your processes; software houses hand over code nobody maintains. Nobody sells a custom build that is also a maintained product.
- **Why now:** AI cut the cost of building software, but vendor price lists haven't caught up. Companies are setting their 2027 budgets now.

## What you sell

Northline Enterprise: a fixed-price build plus annual support, with a co-build discount when Northline keeps the IP.

## Biggest risk

Your employer first: enterprise ERP is the category your employer is buying right now. Daytime presence second: enterprise workshops happen at 10am on weekdays.

## Why now: AI made custom software cheap to build, and nobody has repriced it

1. **Custom builds are still priced by headcount.** Indonesian software houses quote Rp 250M–2B+ for enterprise systems, taking 20–52 weeks at Rp 15–40M per developer per month ([Majapahit](https://majapahit.id/blog/2026/07/01/berapa-biaya-jasa-software-house-indonesia-2026/)). Custom ERP for a mid-size company runs Rp 200–800M over 3–6 months, and SAP-class projects start around Rp 2B and take 12–24 months ([Next IT](https://next-it.co.id/blog/berapa-biaya-implementasi-erp-panduan-budget-untuk-ukm-dan-enterprise)). This repo shows one architect directing agents: 170 commits on 18–19 October 2026, with 205 of Accurate's 229 Manufaktur reports at zero diff. You can quote under a software house and still earn a better margin than they do.
2. **"AI-native ERP" became a headline without much behind it.** Impact puts it on its homepage with no specific AI features described. HashMicro launched the Hashy assistant in 2025 ([Wikipedia](https://en.wikipedia.org/wiki/HashMicro)). Both bolt AI onto a packaged core. An event-sourced ledger is a better base for agents: every change is an event with an actor, so an agent's proposal can go through the same approval workflow as a human's.
3. **Enterprises have reasons to revisit their systems.** Coretax reset tax integrations in 2025, UU PDP has been fully in force since October 2024, and Q4 is budget season. A conversation in November becomes a 2027 line item; a conversation in March waits for 2028.

## AI-native, in three layers

| Layer | What it means | Status |
|---|---|---|
| 1. Built by agents | One architect plus coding agents against acceptance tests (zero-diff vs reference reports). Change requests take days, not sprints. This is the cost advantage. | Proven in repo |
| 2. Runs with agents | Agents for report Q&A, supplier-PDF intake into draft invoices, close checks and WhatsApp approvals. Each agent action is a proposed command, gated by the approval rules (ADR-0028) and recorded with its actor in the activity log. | Report Q&A UI exists in `apps/web/src/features/ai` and `reports/AiPanel`, on mock data; no model backend yet |
| 3. Priced for AI | Fixed price from the blueprint, not time and materials. AI usage billed at cost plus margin with a cap. A per-company switch that blocks cross-border model calls (UU PDP). | Contract templates to draft |

## The receipts

### Pain (8/10 severity, provisional)

- Only 50.6% of ERP projects finished on budget (Panorama Consulting, 2026 report). A vendor-published audit of 640 projects found a median overrun of 47%, with 27% going live on the planned date ([Godlan summary](https://godlan.com/erp-failure-rate/), [Lleverage](https://www.lleverage.ai/company/blog/erp-implementation-failure-why-75-fail-at-189-over-budget-and-how-ai-automation-fills-the-gaps)).
- Super Indo (186 outlets, 800+ staff) replaced an in-house HR system that was "too complicated and no longer serves current needs" ([Impact case studies](https://www.impactfirst.co/)).
- Enterprise ERP like SAP starts around Rp 2B and takes 12–24 months ([Next IT](https://next-it.co.id/blog/berapa-biaya-implementasi-erp-panduan-budget-untuk-ukm-dan-enterprise), paraphrased).
- **Still missing:** direct quotes from Indonesian CFOs, COOs or IT heads. Collect seven in weeks 1–4; severity stays provisional until then.

### Whitespace (market gap)

Enterprises can bend to a package, or bet on a software house and inherit code nobody maintains. Nobody sells a custom build that is also a maintained product, priced at what AI made it cost.

### The wedge

The prospect sees their own ERP running on their own data in five working days, before any purchase order. Then they get a fixed price, with up to 40% off new modules if Northline keeps the generic IP. The incumbents to beat are HashMicro and the Odoo partners.

### Proof and signals

- Indonesia has 50,034 large and 809,344 medium businesses (Ministry of MSMEs data, August 2025, via [Databoks](https://databoks.katadata.co.id/ekonomi-makro/statistik/6acf639d12f03/jumlah-usaha-mikro-kecil-menengah-dan-besar-di-indonesia-pada-2025)). Twenty projects a year is 0.04% of the large tier.
- **Impact shows the model works locally.** [Impact](https://www.impactfirst.co/) is PT Neo Multi Servindo, based in Jakarta Barat. It sells one modular suite and consulting across about 15 industries. The suite covers Core ERP, supply chain, CRM and omnichannel, MRP and manufacturing, and HR including LMS. The consulting covers digital, team and ERP transformation. Clients include Indogal, Super Indo and GDSK (~3,000 staff). It appears to be Odoo-based (its site links to /odoo and Odoo tutorials). It publishes no prices and no outcome numbers.
- Software houses charge 15–25% of the build cost per year for maintenance ([Majapahit](https://majapahit.id/blog/2026/07/01/berapa-biaya-jasa-software-house-indonesia-2026/)). That is the market rate for the recurring line.
- **The IP law favours the maker.** UU 28/2014 Pasal 36: *"Kecuali diperjanjikan lain, Pencipta dan Pemegang Hak Cipta atas Ciptaan yang dibuat dalam hubungan kerja atau berdasarkan pesanan yaitu pihak yang membuat Ciptaan."* In plain terms, the maker owns work made to order unless the contract says otherwise. Copyright transfers by written agreement (Pasal 16) ([DGIP](https://www.dgip.go.id/artikel/detail-artikel-berita/hak-cipta-karya-pekerja-atau-freelancer-milik-siapa?kategori=agenda-ki), [UU 28/2014](https://peraturan.bpk.go.id/Download/28018/UU%20Nomor%2028%20Tahun%202014.pdf)). Enterprise contracts usually demand an assignment; the co-build discount is what you pay to keep it.
- Gartner's widely quoted figure: 55–75% of ERP projects miss their objectives. Prosci's narrower definition gives 11–31% ([Godlan](https://godlan.com/erp-failure-rate/)). Buyers have been burned, so a prototype before the PO is worth a lot.

### Who you're up against (8 players)

| Player | Notes |
|---|---|
| HashMicro | Custom pricing; a competitor estimates ~Rp 150M per module on-premise ([MAS Software](https://www.mas-software.com/blog/fitur-dan-harga-hashmicro), biased source). Outbound sales team; Hashy AI assistant since 2025. |
| Impact | Modular suite plus transformation consulting; "AI-native ERP" headline; apparently Odoo-based. The model to copy and to beat on speed. |
| Odoo partners | About 42 local partners; Rp 230–600M in the first year for 20–50 users ([Digisolf](https://www.digisolf.com/en/blog/odoo-13/berapa-sih-harga-software-erp-di-indonesia-inilah-perbedaannya-105)). Their custom modules tie the client to the partner. |
| SAP Business One partners | Rp 500M–2B. The default choice for mid-size manufacturers with a budget. |
| SAP S/4HANA, Oracle | From ~Rp 2B, 12–24 months. Out of reach for now. |
| Dynamics 365, NetSuite partners | Global brands with local partners; strong in multinationals' Indonesian subsidiaries. |
| Local software houses | Rp 250M–2B+, 20–52 weeks. The client owns code it often can't maintain. |
| In-house IT | "We'll build it ourselves." Sell to them as an accelerator. |

## The catalog: products, industries, services (honest status)

"Built" means API code and tests exist in this repo. The web UI is still mostly mock (9 of 11 data modules). "Co-build" means a client pays to bring it into existence and Northline then owns it.

| Group | Built | Partial | Co-build | Blocked |
|---|---|---|---|---|
| Core ERP | Accounting and GL, sales and invoicing, purchasing, inventory FIFO/average, cash and bank, fixed assets, approvals, returns, 200+ reports | Quotations and orders, multi-company and consolidation (backend is single-company) | Mobile | |
| Supply chain | | Multi-warehouse transfers | WMS, logistics and TMS, fleet, barcode | |
| Manufacturing | Job orders and job costing | | MRP planning, MES, PLM, quality, maintenance (CMMS), batch and expiry | |
| CRM and omnichannel | Customers, salesmen, commissions, price adjustments | | CRM pipeline, POS, eCommerce and marketplace | |
| People | | Employees and loans, expense accruals | Payroll PPh 21 and BPJS, attendance and shifts, recruitment, LMS | |
| AI and compliance | Activity log with actor | Report Q&A (UI only) | Invoice intake, close checks, WhatsApp approvals, Coretax via PJAP | |
| Industries | Distribution and trade, manufacturing | Retail and wholesale, contractor and project | Food production and central kitchen, textile and garment, logistics, pharmacy, rental, real estate and construction, nonprofit, energy and resources | Healthcare and clinics (until you leave your employer) |
| Services | | Zero-diff data migration | Process blueprint and gap analysis, transformation roadmap, integrations (bank, marketplace, PJAP), data and analytics, AI agent design, training and change management, support and managed hosting | |

Industry profiles beyond Trade, Manufaktur and Retail are ADR-0031 presets that don't exist yet. Each should arrive through a paid co-build.

## The verdict: should you build this?

### Reasons to build

- **One project pays more than v1's whole first year.** A single signature brings Rp 290M–1B+, against Rp 245M from five SaaS customers.
- **AI changed your cost but not your buyer's price expectations.** You can quote 30–50% under a software house and keep a 60%+ margin.
- **Co-builds turn client money into product.** Each new module is funded once and resold at catalog price, so services revenue builds IP instead of just headcount.
- **Your résumé fits what enterprise buyers check.** You lead a multi-brand ERP replatform and serve as ISO 27001 management representative.
- **You no longer fight Accurate on price.** Buyers compare you with SAP and HashMicro quotes.

### Reasons not to build

- **Sharpest possible employer conflict.** Your employer is replatforming its own enterprise ERP with an outside vendor. Without written consent, stop.
- **Enterprises buy from firms, not individuals.** Vendor registration wants a PT, tax status, references and often company age. A new PT with no case study fails some procurement desks outright.
- **Delivery happens in the daytime.** Blueprint workshops, UAT and go-live run 9 to 5, so you need a daytime functional consultant from the first deal.
- **Fixed-price custom work is how ERP vendors go broke.** A loose blueprint or a skipped change-request clause eats the margin, and the price risk is now yours.
- **Services can trap you in project work.** If co-built modules never get generalized and resold, you've built a software house, not a product company.

## Founder fit: not every good idea is good *for you*

| Best for | Not for |
|---|---|
| Engineers who have led an enterprise ERP replatform | Founders who can't be in a client's room on a weekday |
| Founders with a CFO, COO or IT-head network | Anyone with a day job in the same category and no written consent |

You have the credibility half: an ERP replatform, ISO 27001, and proof that agents can write most of the code. You lack the firm half: an entity enterprises will register, a first reference, and someone available at 10am on a Tuesday. Borrow trust from people who already have it:

- public accounting firms (KAP) and tax consultants, who find ERP gaps in every audit
- transformation consultancies like Impact, which need build capacity they can resell
- companies burned by a failed Odoo or SAP project, who want a second opinion

A white-label subcontract can become your first reference before your own brand is.

**So, is it good for you?** Only with written consent from your employer and a daytime partner. If you get both, this is a better use of your evening hours than v1: fewer customers, ten times the ticket.

## Week 0 gate: clear these before the first sales call

1. **Employment contract and written consent.** Pasal 36 makes the maker the default copyright owner, but employment contracts usually override it. Enterprise ERP is the category your employer is buying now, so get consent in writing or stop. Keep its vendors, its customers and the healthcare vertical out.
2. **Your own tools.** Use your own Claude subscription and your own model API key, on personal accounts and hardware. Never use the employer's five Team seats.
3. **A firm enterprises can register.** You need a PT with NIB and NPWP. Plan for PKP early, because enterprise buyers need a tax invoice. A PT Perorangan works to start, but check with your first prospect's procurement team before relying on it. For a regular PT with your wife at 1%, ask a notary about joint marital property first.
4. **Contract templates reviewed by an IP lawyer.** The MSA needs:
   - the co-build IP clause
   - a perpetual licence and source escrow
   - a 12-month exclusivity window
   - change-request pricing
   - a UU PDP data-processing addendum

   Budget Rp 10–30M for the review.
5. **A daytime partner.** Name the functional consultant or accountant who attends workshops and UAT, paid per project from the down payment.

## The value ladder

The model follows Impact: a free look, a paid blueprint, a fixed-price build, then annual support. Two things are different. You own every line of code, so there is no Odoo licence underneath. And when the client needs something that doesn't exist, you build it at a discount in exchange for the right to resell it.

1. **Lead magnet: your ERP on your data, in five days (Rp 0).** One critical workflow, built by agents on the prospect's own Excel exports and demoed on a throwaway instance (ADR-0032).
2. **Frontend: paid blueprint (Rp 35–75M, credited to the project).** Three to four weeks of process mapping, gap analysis against the catalog, a migration dry run and a fixed-price proposal. The client keeps the blueprint even if they walk away.
3. **Core: Configure, Extend or Co-build (Rp 290M–1B+).** Paid in milestones of 30 / 40 / 30.
   - **Configure (Rp 290–450M):** catalog modules, migration, training, go-live.
   - **Extend (Rp 450–750M):** adds client-specific workflows and integrations.
   - **Co-build (list Rp 1B+):** new modules at 30–50% off when Northline keeps the generic IP.
4. **Continuity: support, hosting and agents (15–20% of project value per year).** A dedicated instance, backups and restore drills, upgrades, an SLA, capped AI usage and quarterly improvement sprints. On-premise as a premium tier.
5. **Flywheel: vertical packs, resold (at Configure price, ~75%+ margin).** Each co-built module is generalized into a catalog pack, and the next client in that industry pays Configure price.

### Co-build terms

| | Full ownership | Co-build (default) |
|---|---|---|
| Price | List, e.g. Rp 1.08B in the mockup | 30–50% off new modules, e.g. Rp 816M |
| Generic module copyright | Assigned to the client | Kept by Northline (Pasal 36 default, confirmed in the MSA) |
| Client gets | Full source and all rights | Perpetual, royalty-free licence; source escrow; ownership of its data, configuration and client-specific extensions |
| Resale | Northline cannot resell | Not to named direct competitors for 12 months; then resold as a catalog pack |
| Sweetener | | 5% of each resale credited to the client's support bill for 3 years |

The product never contains client data, client names or client-specific rules. Code that clients pay to have built only becomes resellable if the codebase keeps generic modules separate from client-specific code. See [ADR-0033](../../decisions/0033-core-and-client-extensions.md).

## The plan: if you started today

### First up

Enterprises don't find custom ERP vendors through search. They hear about them from their auditor, their consultant or a peer CFO. The first paid work comes through borrowed trust: an introduction from a KAP partner or tax consultant, or a white-label subcontract from a transformation consultancy. The five-day prototype then turns the introduction into a blueprint. Get those conversations into 2027 budgets before December.

### Timeline (~12–15 hours/week, plus a daytime partner from the first down payment)

| When | Step | Exit |
|---|---|---|
| Wk 0 (19–25 Oct 2026) | **Clearance gate:** contract, written consent, own tools, PT route, IP lawyer engaged, daytime partner named | Go/no-go in writing |
| Wk 1–4 (26 Oct – 22 Nov) | **Proof kit:** five-day prototype pipeline (throwaway instance per prospect, Excel import, AI report panel on a real model for three questions); co-build MSA draft; security pack; catalog page | Prototype on a stranger's data in 5 working days |
| Wk 1–10 (26 Oct – 3 Jan) | **Pipeline, in parallel:** 60 warm conversations (see below); 7 pain quotes | 15 qualified, 6–8 prototype slots booked |
| Wk 4–12 (Nov–Dec 2026) | **Prototypes on their data:** 6–8 free five-day prototypes, each ending with a blueprint proposal and a 2027 budget line | 2–4 prospects ask for a blueprint |
| **Wk 10–15 (Jan 2027)** | **First paid blueprint:** Rp 35–75M, 3–4 weeks, credited to the project. Stretch goal: white-label subcontract signed in December | **Target: blueprint signed and paid by 31 Jan 2027 (~day 104)** |
| **Feb–Apr 2027** | **First project contract:** blueprint, then fixed-price proposal, then 30% down payment; daytime partner goes on contract from that payment | **Target: Rp 290M+ signed, down payment received by 30 Apr 2027 (~day 193)** |
| May–Oct 2027 | **Deliver and generalize:** go-live in 12–20 weeks; generalization pass turns the co-built module into a catalog pack; second project signed, ideally a resale of that pack | One live reference, two projects signed |
| Q4 2027 | **Quit-job gate:** signed backlog ≥ 12 months of take-home pay, six months of runway, a partner running client contact. May come earlier than in v1 because enterprise work needs daytime presence | Decision in writing |
| 2028+ | **The catalog compounds:** vertical packs resold at Configure price; HR, payroll and LMS as modules; healthcare only after you've left your employer | |

The 60 warm conversations come from four sources:
- your own network, outside your employer's industry and vendors
- KAP and tax firms with enterprise clients
- transformation consultancies that need build capacity
- companies after a failed implementation

### Year one, on a napkin

| Step | Value |
|---|---|
| Warm conversations (Oct–Mar) | 60 |
| Qualified: budget ≥ Rp 290M, sponsor, pain (assumption) | 25% = 15 |
| Take the free 5-day prototype (assumption) | 50% ≈ 8 |
| Buy a blueprint at Rp 50M (assumption) | 40% ≈ 3 |
| Sign a project, average Rp 550M (assumption) | 2 of 3 |
| Contract value (1 unconverted × 50M + 2 × 550M, blueprints credited) | Rp 1.15B |
| Collected in year one (milestones ~70%) | ~Rp 820M |
| Delivery cost: partner Rp 20M/month × 8, AI and hosting Rp 20M, legal Rp 30M | ~Rp 210M |
| Year-two revenue: remaining 30% (Rp 330M) + support 18% × 1.1B (Rp 200M) + 5 new projects × Rp 600M, 2 of them resales | ~Rp 3.5B |

Year one buys a reference, a partner and the first vertical pack. In USD at Rp 18,000:

| | USD |
|---|---|
| Collected in year one | ~US$46K |
| Year one after delivery cost | ~US$34K |
| Year two | ~US$195K |

**Ceiling: US$3–8M a year.** 60 projects a year × Rp 750M ≈ Rp 45B, plus 250 installed clients × Rp 120M a year in support ≈ Rp 30B. That totals ~Rp 75B ≈ US$4.2M. Services revenue grows with people; the resold packs are what lift the margin.

## Jam on it with your agents

Five parallel lanes, run on your own seats.

- **Start here:** *"Read docs/business/v2-enterprise-custom/northline-enterprise-brief.md. Build the five-day prototype kit: a script that provisions a throwaway instance (ADR-0032), loads a prospect's Excel masters and one month of transactions, and maps their top three workflows to catalog modules, marking each gap as a co-build candidate."*
- **Roast:** *"Roast this brief as the CFO of a 1,200-staff Indonesian food group holding an SAP Business One quote. Why would you refuse a solo-founded vendor, and what proof would change your mind?"*
- **Co-build contract:** *"Draft MSA clauses in Bahasa Indonesia and English: IP retention for generic modules under UU 28/2014 Pasal 16 and 36, a perpetual licence, source escrow, 12-month exclusivity, change-request pricing and a UU PDP addendum. Flag every clause for lawyer review."*
- **AI agent lane:** *"Wire apps/web/src/features/reports AiPanel to a real model through a server-side API route: read-only report tools, actor logging through the activity log, a usage cap, and a per-company switch that blocks cross-border model calls."*
- **Partner outreach:** *"Draft Bahasa Indonesia outreach for KAP partners, tax consultants and transformation consultancies, offering white-label AI-native build capacity and a referral fee of 10% of project value."*

## Not verified

- Whether PT Perorangan passes enterprise vendor registration (varies by buyer).
- HashMicro's real price: only a competitor's estimate is public.
- Panorama's 2026 figures, cited through secondary summaries.
- Impact's Odoo base, inferred from its site links.
- The enforceability of the co-build clauses, which needs an IP lawyer.

## Sources

- [Impact (impactfirst.co)](https://www.impactfirst.co/)
- [Majapahit Teknologi: software house rates 2026](https://majapahit.id/blog/2026/07/01/berapa-biaya-jasa-software-house-indonesia-2026/)
- [Next IT: ERP implementation budget 2026](https://next-it.co.id/blog/berapa-biaya-implementasi-erp-panduan-budget-untuk-ukm-dan-enterprise)
- [MAS Software: HashMicro features and price](https://www.mas-software.com/blog/fitur-dan-harga-hashmicro)
- [HashMicro (Wikipedia)](https://en.wikipedia.org/wiki/HashMicro)
- [Digisolf: ERP prices in Indonesia](https://www.digisolf.com/en/blog/odoo-13/berapa-sih-harga-software-erp-di-indonesia-inilah-perbedaannya-105)
- [Godlan: ERP failure rate 2026](https://godlan.com/erp-failure-rate/)
- [Lleverage: ERP implementation failure](https://www.lleverage.ai/company/blog/erp-implementation-failure-why-75-fail-at-189-over-budget-and-how-ai-automation-fills-the-gaps)
- [DGIP: copyright of employee and freelancer work](https://www.dgip.go.id/artikel/detail-artikel-berita/hak-cipta-karya-pekerja-atau-freelancer-milik-siapa?kategori=agenda-ki)
- [UU 28/2014 on copyright (BPK)](https://peraturan.bpk.go.id/Download/28018/UU%20Nomor%2028%20Tahun%202014.pdf)
- [Databoks: business counts 2025](https://databoks.katadata.co.id/ekonomi-makro/statistik/6acf639d12f03/jumlah-usaha-mikro-kecil-menengah-dan-besar-di-indonesia-pada-2025)
