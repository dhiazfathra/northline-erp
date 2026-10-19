# Northline: the ERP mid-market Indonesian companies can switch to without their accountant flinching

> Founder brief, 2026-10-19. Companion page: [`northline-business-brief.html`](northline-business-brief.html).
> Money is in IDR; USD figures use an assumed Rp 18,000 / US$. Every figure is either sourced (see [Sources](#sources)) or marked *assumption*.

**SaaS + implementation · B2B Indonesia · Year-one target Rp 200–300M · Ceiling US$5–15M ARR**

---

## At a glance

| | |
|---|---|
| Accurate reports reproduced to the cell | **205 / 229** (Manufaktur catalog; 24 out of scope) |
| Pricing | Rp 15–35M setup + Rp 2.5–7.5M / month per company |
| First revenue | 75–105 days (target: signed by 31 Jan 2027) |
| Capital in | Rp 15–40M (~US$0.8–2.2K) |
| Difficulty | Hard (sales and trust, not code) |
| Year one | Rp 200–300M (~US$11–17K) |
| Ceiling | US$5–15M ARR |
| Closest incumbent | Accurate Online (CPSSoft) |

**What it demands (0–10):** Sales 9 · Trust 10 · Domain depth 8 · Build 6 · Capital 3

## The pitch

A distributor with three branches and 40 staff runs its books on Accurate Online. It pays a few hundred thousand rupiah a month, plus per-branch and per-module add-ons, and it has hit the ceiling: approvals live in WhatsApp, consolidation lives in Excel, and Coretax broke their tax workflow in 2025. The next step up is Odoo or SAP Business One at Rp 230M to Rp 2B in year one. Nothing trusted sits in between.

Northline closes that gap. It imports the company's Accurate data, closes one month in parallel, and hands the accountant a report pack that matches Accurate **cell for cell**. Then it adds what Accurate can't: approvals, multi-branch dimensions, budgets, job costing, and later payroll and HRIS on the same ledger.

## Who it's for

Indonesian companies with roughly 20–300 staff, Rp 15B+ annual sales, already on Accurate (or Jurnal, Zahir, Excel), that have outgrown it but can't justify an SAP/Odoo project. First profile: **trading/distribution** (the Trade Portal catalog is already mostly zero-diff), then manufacturing and retail.

**The gap:** everyone sells a new ERP. Nobody sells *proof* that your numbers will come out the same after you switch.

**Why now:** Coretax forced every VAT-registered company to rewire its tax workflow, AI collapsed the cost of building an ERP, and January 1 is the natural cutover date. All three land in the next 10 weeks.

## What you sell

**Northline Core**, Rp ~4M / month average, migration included in a one-time go-live fee.

## Biggest risk

Two, and they compound. First, **employer conflict**: you lead IT engineering at a company in the middle of its own ERP replatform, clinics are on your expansion list, and the Claude seats you plan to use belong to your employer. Second, **trust**: a part-time solo vendor with zero references is asking a finance manager to move the system of record. Fix the first in week 0. Design everything else around the second.

---

## Why now: three curves crossed in 2025–26

**1. Coretax reset the tax stack.** DJP's Coretax went live on 1 January 2025 and companies hit login failures, save errors and certificate problems; a Jakarta tax assistant reported they couldn't upload invoices or create withholding slips. DJP kept the old e-Faktur running alongside it (KEP-54/PJ/2025), then tightened: PER-11/PJ/2025 requires e-Faktur through Coretax or an authorized PJAP, and PER-19/PJ/2025 (effective 22 Oct 2025) lets DJP cut off invoicing access for repeat non-compliance. Invoices cancelled in e-Faktur Desktop showed up as still approved in Coretax. Every finance team re-examined its tooling this year. That is a buying window.

**2. Building an ERP stopped being the hard part.** This repo has 170 commits from 18–19 Oct 2026, on top of two weeks of spec work, and reproduces 205 of Accurate's 229 Manufaktur reports at zero diff, plus most of the Retail and Trade Portal catalogs. A product that used to need a 10-person team for two years is now a solo founder's evenings. The scarce resource is distribution and trust.

**3. The calendar.** Companies switch accounting systems at a period boundary, usually 1 January. Accountants and tax consultants are free in Oct–Dec and buried from January to the corporate tax return deadline at the end of April. The partner-recruiting window is **now**; the next easy cutover after February is a quarter away.

## The receipts

### Pain (7/10 severity, provisional)

- Coretax launch: a tax assistant at a Jakarta company said work stalled because they couldn't upload tax invoices or create withholding slips. *(Espos.id, 2025, paraphrased)*
- Sync breakage: invoices cancelled in e-Faktur Desktop remained approved in Coretax; DJP stopped auto-migrating cancellations from 8 Nov 2025. *(Pajakku; Bisnis Best Friend)*
- Price creep at the ceiling: Accurate's base plan is Rp 333,000/month, but multi-branch is Rp 99,900 per branch per month and the manufacturing add-on is Rp 2,220,000 per month. *(Accurate reseller price lists, 2026)*

**Receipts still missing:** no direct quotes from Indonesian finance managers yet. Collect seven in weeks 1–3 (see the plan). Severity stays provisional until then.

### Whitespace (market gap)

Companies that outgrow Accurate can't leave without relearning every report, and the jump to Odoo or SAP B1 is a 50–500× price cliff.

### The wedge

A **zero-diff migration**: import Accurate data, close one month in parallel, show the accountant identical reports, then switch on what Accurate lacks. Incumbent to beat: **Accurate Online**.

### Proof and signals

- Indonesia has **50,034 large and 809,344 medium businesses** (Ministry of MSMEs data, Aug 2025). *(Databoks)*
- **32,078 medium and large manufacturers** employ 7.34M people (BPS, 2024). *(Databoks)*
- **The price cliff:** Accurate starts around Rp 4M/year; Odoo Enterprise for 20–50 users runs Rp 230–600M in year one; SAP Business One Rp 500M–2B. *(Accurate resellers; Digisolf)*
- **Indonesia ERP market:** roughly US$0.4–0.93B in 2025, growing ~15–18% a year (estimates disagree by 2×). *(Next Move Strategy Consulting; Mordor Intelligence)*
- **PJAP rules tightened:** PER-5/PJ/2025 requires PJAPs to be Indonesian PT, PKP, majority-Indonesian-owned, with all infrastructure in Indonesia. Integrate *through* a PJAP; don't become one. *(IKPI; Pajakku)*

### Who you're up against (8 players)

| Player | What matters |
|---|---|
| **Accurate Online** (CPSSoft) | Rp 333K/month base incl. 1 user; add-ons per branch, POS outlet, manufacturing (Rp 2.22M/month). Claims 300K+ businesses. Resellers earn ~Rp 1M per closed client; large training/implementation partner network. |
| **Mekari Jurnal** | "Trusted by 35,000+ businesses"; est. US$7.5M ARR (GetLatka estimate). Bundles with Talenta and KlikPajak at 20–30% off. |
| **Mekari Talenta** (HRIS) | From Rp 25K/employee/month; higher tiers Rp 35–100K. Benchmark for the HRIS expansion. |
| **Odoo** (~42 local partners) | Rp 230–600M first year for 20–50 users. Partner quality varies. |
| **SAP Business One** (32 partners) | Rp 500M–2B one-time. Default for mid-size manufacturers with budget. |
| **HashMicro** | Local ERP suite sold through a large outbound sales team. |
| **Zahir** | Long-running local accounting software, desktop heritage. |
| **ERPNext** | Open source, local implementers; cheap licence, implementation risk. |

## The verdict: should you build this?

### Reasons to build

- There is a 50–500× price cliff between Accurate and Odoo/SAP with no trusted product in between, and 800K+ medium businesses sit near it.
- Zero-diff is a trust asset nobody else sells. "Your reports will match" is checkable by the customer's own accountant, which is the person who vetoes ERP switches.
- The product is unusually far along for a pre-revenue idea: 205/229 Manufaktur reports verified, retail and trade catalogs mostly done, event-sourced ledger, 218+ tests.
- Founder credibility with corporate IT: you lead a 13-person engineering org, run an ERP replatform, and are an ISO 27001 management representative. You can answer a vendor-security questionnaire better than most local ERP vendors.
- Expansion reuses the ledger: payroll posts to the GL, HRIS sits on payroll, vertical profiles (ADR-0031) are configuration on one core.

### Reasons not to build

- **Employer conflict is binary.** Your employer is mid-ERP replatform, your expansion list includes clinics (your employer's industry), and the 5 Claude seats are the employer's. Any of these can hand your employer an IP claim or a dismissal case. Your own notes mark the contract check as *unchecked*.
- **It isn't pilot-ready.** 9 of 11 web data modules are mock, the backend is single-company, and there is no Accurate importer, no e-Faktur submission and no backup/restore story yet.
- **System-of-record sales are slow.** Corporates run vendor registration, ask for references and take 3–9 months. A part-time solo founder is the bottleneck on every step.
- **Month-end support collides with the day job.** Close emergencies hit on days 1–5 of each month, during office hours. You can't promise an SLA alone; an accountant partner has to be first-line support.
- **Accurate can respond.** It has 300K+ customers, a reseller army and room to cut add-on prices. Also: the capture scripts in `tools/accurate/` may conflict with Accurate's terms. Keep captures internal, never ship Accurate assets, and market "migrates from Accurate", not "Accurate clone".

## Founder fit: not every good idea is good *for you*

**Best for:** ✓ engineers who have shipped an ERP to production · ✓ founders with an accounting-firm or tax-consultant network
**Not for:** ✗ founders who can't sell to finance managers · ✗ founders whose day job is in the same product category without written consent

You have the first half of this idea: the build, the security posture and the engineering credibility. You don't yet have the second half: a list of 20 finance managers or accountants who would take your call. That is the whole game for the first customer. An insider at an accounting firm gets the first pilot in a week; a technical founder without that network spends months earning the same trust. So your first job is borrowing trust from people who already have it (accountants, tax consultants, Accurate implementers), not writing more reports.

## Week 0 gate: clear these before writing more code

1. **Employment contract.** Read the IP, moonlighting and non-compete clauses. If ERP or accounting software is anywhere near your employer's business, get **written** consent, or stop. Exclude the clinic/aesthetics vertical and your employer's vendors (including Pitados) until you've left.
2. **Your own tools.** Don't build this on employer-provided Claude Team seats, laptops or hours. Work done on employer accounts strengthens an employer IP claim and may breach the Team plan's terms. Buy your own subscription (e.g. one Claude Max seat) and keep the repo on personal accounts only.
3. **Legal entity.** Corporate buyers need a PT with NIB and NPWP, and usually prefer a VAT-registered (PKP) vendor. Two options:
   - **PT Perorangan:** single founder, cheap, allowed for micro/small businesses; convert later.
   - **PT with your wife at 1%:** many notaries treat a husband and wife without a prenuptial/postnuptial agreement (*perjanjian kawin*) as one owner of joint marital property, so the two-shareholder rule may not be met. Confirm with a notary before you rely on it.

## The value ladder

1. **Lead magnet: Free Parallel Close (Rp 0).** One month of the prospect's Accurate books imported and closed in Northline. Returns the full report pack, a diff sheet (target: 0 differences) and a one-page list of what is slowing their close. One week, no obligation.
2. **Frontend: Migration & Go-Live (Rp 15–35M one-time).** Opening balances, master data, two training sessions, and the first live month-end close done alongside their team.
3. **Core: Northline Core (Rp 2.5–7.5M/month per company).** Priced by profile and branches. Accounting, inventory, sales and purchasing, 200+ reports, a dedicated instance, daily backups, export any time.
4. **Continuity: add-ons.** Coretax/e-Faktur connector through a PJAP partner; payroll and HRIS (Rp 15–25K per employee/month, under Talenta's entry price); multi-entity consolidation; AI close checks.
5. **Partner: accountant program.** 20% recurring revenue share plus implementation work for the partner firm. They own first-line support; you own the product.

## The plan: if you started today

### First up

Nobody in Indonesia searches for "zero-diff Accurate migration". Finance managers trust their accountant, their tax consultant and the person who set up Accurate for them. So the first customer comes through a borrowed relationship and a free Parallel Close that puts identical numbers in front of the accountant. SEO, ads and cold LinkedIn won't deliver the first ten customers.

### Timeline (assumes ~12–15 hours/week next to the day job)

| When | Phase | Exit criterion |
|---|---|---|
| **Wk 0** · 19–25 Oct 2026 | **Clearance gate.** Contract check, written consent if needed, personal Claude seat, PT route chosen with a notary. | Go/no-go in writing. No consent, no build. |
| **Wk 1–6** · 26 Oct–6 Dec | **Pilot-ready build.** Wire the 9 mock UI modules to the API for Trade profile flows; Accurate importer (API or Excel export); one dedicated instance per customer (ADR-0032); backups and restore drill; auth hardening; Parallel Close report generator. | You can run a Parallel Close on a stranger's data in under 3 days. |
| **Wk 1–8** · 26 Oct–20 Dec (parallel) | **Channel.** List 40 accounting/tax firms and Accurate implementers; 20 conversations; 7 recorded pain quotes; sign 3–5 referral partners before their January rush. | 3 partners who will introduce a client. |
| **Wk 6–10** · Dec 2026 | **Design partners.** 2–3 free Parallel Closes on November books. Fix every diff. | ≥1 prospect sees 0 differences and asks about price. |
| **Wk 10–15** · Jan 2027 | **First paying customer.** Parallel-close December (year-end), sign, invoice the go-live fee. Stretch: a paid pilot signed in December. | **Contract signed and setup fee paid by 31 Jan 2027 (~day 104).** |
| **Feb–Apr 2027** | **Go-live and repeat.** First customer live on 1 Feb; 3–5 customers by end of April; Coretax connector through a PJAP API. Partners are busy with tax season, so lean on direct referrals from customer #1. | 3–5 paying, ≥1 public reference. |
| **May–Sep 2027** | **Second product.** Payroll (PPh 21 TER, BPJS) on the ledger for existing customers, the seed of HRIS. Second profile: manufacturing or contractor (job costing exists). Multi-tenancy only if dedicated instances get expensive. | 10–12 customers, payroll attached to ≥30%. |
| **Q4 2027** | **Quit-job gate.** Leave only when MRR ≥ 1.5× your monthly take-home for 3 straight months, with ≥12 customers and 6 months of runway. | Decision in writing. |
| **2028+** | **Suite.** Retail/F&B (POS), LMS, HRIS as a standalone product, and clinics only after you've left your employer. | Multi-product ARR. |

### Year one, on a napkin

Every row is an assumption except the last two derived lines.

| Line | Value |
|---|---|
| Accounting/tax firms and Accurate implementers contacted (Oct–Dec) | 40 |
| Become referral partners (*assumption* 25%) | 10 |
| Warm intros per partner in year one (*assumption*) | 2 → 20 |
| Intros from your own network (*assumption*) | 10 → 30 prospects |
| Accept a free Parallel Close (*assumption* 40%) | 12 |
| Convert to paid (*assumption* 40%) | ~5 customers |
| Go-live fee | Rp 25M |
| Subscription, average (*assumption*) | Rp 4M / month |
| Average months live in year one | 6 |
| **Year-one revenue** (5 × 25M + 5 × 4M × 6) | **~Rp 245M (~US$14K)** |
| **Year-two revenue** (5 renewals × 4.5M × 12 + 15 new × 4.5M × 6 + 15 × 25M) | **~Rp 1.05B (~US$58K)** |

Year one doesn't replace a salary. It buys three things: references, a partner channel, and the evidence to decide on quitting in Q4 2027.

**The ceiling if it compounds: US$5–15M ARR.** 1,500 customers × Rp 8M/month across ERP + payroll/HRIS + add-ons ≈ Rp 144B/year ≈ US$8.0M. For scale, Mekari Jurnal is estimated at US$7.5M ARR with 35,000+ businesses.

## Jam on it with your agents

Five parallel lanes, run on **your own** seats (see Week 0):

1. **Build lane:** pilot-ready scope from the timeline, one mock module at a time, keeping the zero-diff suite green.
2. **Importer lane:** Accurate → Northline import and the Parallel Close diff report.
3. **Proof lane:** re-run the Accurate captures and fixtures; keep the 205/229 number honest.
4. **GTM lane:** partner list, outreach scripts in Bahasa Indonesia, a one-page security pack (ISO 27001-aligned) and a DPA template for UU PDP.
5. **Review lane:** a second agent reviews every change to ledger, tax and costing code.

Prompts to start with:

- *"Read docs/business/v1-mid-market-saas/northline-business-brief.md and the timeline. Produce a pilot-ready backlog for the Trade profile: every mock module in apps/web/src/api, the API route it needs, and an estimate in evening-hours."*
- *"Roast this brief as an Indonesian CFO of a 3-branch distributor. What makes you refuse to switch off Accurate, and what proof would change your mind?"*
- *"Draft a WhatsApp and email outreach sequence in Bahasa Indonesia for tax consultants offering a free Parallel Close for one of their clients, with a 20% recurring referral share."*

---

## Sources

- Accurate Online pricing 2026 (reseller lists): https://software-akuntansi.id/harga/ · https://penjualanonline.id/accurate-online-harga-accurate-online/
- Accurate referral and reseller programs: https://accurate.id/ace/ · https://joinreseller.id/
- Mekari Jurnal: https://www.jurnal.id/en/ · ARR estimate https://getlatka.com/companies/mekarijurnal.com
- Talenta pricing: https://albatech.id/blog/berapa-biaya-hris-indonesia-2026-panduan-harga · https://www.capterra.com/p/241697/Talenta/pricing/
- Odoo and SAP B1 costs in Indonesia: https://www.digisolf.com/en/blog/odoo-13/berapa-sih-harga-software-erp-di-indonesia-inilah-perbedaannya-105 · partners https://www.impactfirst.co/c/erp-software · https://www.erpresearch.com/sap-partners/indonesia
- Indonesia ERP market: https://www.nextmsc.com/report/indonesia-erp-software-market-ic3612 · https://www.mordorintelligence.com/industry-reports/indonesia-digital-software-solutions-market
- Business counts: https://databoks.katadata.co.id/ekonomi-makro/statistik/6acf639d12f03/jumlah-usaha-mikro-kecil-menengah-dan-besar-di-indonesia-pada-2025 · https://databoks.katadata.co.id/ketenagakerjaan/statistik/6abcb13566e66/sebaran-tenaga-kerja-industri-manufaktur-menengah-besar-di-indonesia-pada-2024
- Coretax: https://ekonomi.espos.id/coretax-masih-bermasalah-djp-dan-dpr-sepakat-padukan-dengan-sistem-lama-2058631 · https://pajakku.com/artikel/status-faktur-pajak-di-e-faktur-dan-coretax-tidak-sinkron-begini-cara-mengatasinya · https://bisnisbestfriend.co.id/artikel/migrasi-faktur-ke-coretax/ · https://ikpi.or.id/en/mulai-oktober-2025-akses-e-faktur-bisa-dihentikan-djp-perketat-kepatuhan-pajak-lewat-coretax-2025/
- PJAP rules (PER-5/PJ/2025): https://ikpi.or.id/en/per-5-pj-2025-pjap-wajib-sesuaikan-dengan-era-coretax/ · https://www.sipajak.com/post/panduan-api-coretax
- Repo facts: `README.md`, `handoff-2.md`, `docs/reports/_coverage.md`, `docs/decisions/0017`, `0031`, `PLAN.md`, `git log`.

*Not verified: Accurate's terms of service on automated capture; the current state of e-Faktur Desktop in 2026; your employment contract; notary practice on husband–wife PTs. Each is a week-0 check.*
