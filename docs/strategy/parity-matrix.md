# Parity matrix: Accurate, Odoo 20.0 Community, Impact

Date: 2026-10-21. Every row maps to a backlog item in [README.md](README.md). Change a row's status in the same commit
as the code that changes it.

Status: **Built** · **Partial** (some of it exists, the gap is named) · **Gap** · **Integrate** (closed through a
documented connector, ADR-0046) · **Divergence** (accepted in an ADR).

## 1. Accurate Online

Source: accurate.id, accurate.id/online/fitur/ and accurate.id/harga/, read 2026-10-21. Price: Rp 333,000 per month for
1 user and 1 company, plus Rp 22,200 per extra user.

| Accurate offering | Northline | Next |
|---|---|---|
| Penjualan (sales) | Built: quotations, orders, deliveries, invoices, receipts, down payments, returns, salesmen and commission | N1 UI |
| Pembelian (purchasing) | Built: orders, receipts, invoices with expense lines, payments, down payments, returns, vendor prices | N1 |
| Persediaan (inventory) | Built: warehouses, batches, serials, expiry, transfers, stock opname, FIFO and average costing, job orders | N1 |
| Kas & Bank | Built: receipts, payments, transfers, reconciliation, employee loans | X3 |
| Buku Besar (ledger) | Built: journals, periods, accounts, budgets, month-end, currency revaluation | — |
| Laporan Keuangan ("200+ reports") | Built: 291 reports, 288 zero-diff, 3 Divergence (ADR-0039) | hold |
| Perusahaan (company) | Built: access groups (ADR-0040), approvals (ADR-0028), activity log (ADR-0019). Partial: per-company settings (ADR-0037) | X4 |
| Aset Tetap (fixed assets) | Built | — |
| Multi Branch add-on (Rp 99,900/month) | Built as a journal dimension (ADR-0022) | — |
| Cost & Profit Center add-on (Rp 111,000/month) | Built: department and project dimensions (ADR-0022) | — |
| Accurate Manufaktur add-on (Rp 2.22M/month) | Partial: job costing, material usage; 7 forms are Divergence (ADR-0044) | X5 |
| Trade Portal (beta) | Partial: its reports are verified (ADR-0029); the B2B document exchange itself is not built | after X2 |
| E-Meterai | Gap | X10 |
| SmartLink Tax (e-Faktur through a PJAP) | Gap: tax reports exist, no Coretax export | N8 |
| SmartLink e-Banking | Gap: payment-order reports are at spec (ADR-0015) | X3 |
| SmartLink e-Commerce | Gap | X9 |
| SmartLink e-Payment | Gap | X2, then a payment gateway |
| Accurate POS (Rp 222,000/month) | Gap | X7 |
| Accurate Lite (mobile) | Partial: responsive web, checked at 390 px (PLAN.md) | X6 |
| API integration | Partial: OpenAPI and Scalar (ADR-0020), session login only, no API keys or webhooks | X2 |
| Private cloud | Partial: a dedicated instance per customer (ADR-0032), not yet scripted | N6 |
| Import and export | Partial: CSV download on 5 reports; no import | N5, X1 |
| Printable forms | Gap | N7 |
| ISO 27001 certificate | Gap | E4 |
| Web app on live data | Built: every screen except workspaces and the AI panel (ADR-0049) | — |

## 2. Odoo 20.0 Community

Source: the 34 modules with `'application': True` in `addons/*/__manifest__.py` on branch `20.0` of
github.com/odoo/odoo, read 2026-10-21 (642 addons in all). To reproduce, sparse-checkout `/addons/*/__manifest__.py` on
that branch and grep for `application`.

| App (module) | Northline | Next |
|---|---|---|
| Accounting / Invoicing (`account`) | Built, with Indonesian rules. Gap: Coretax export, which Community ships as `l10n_id_efaktur_coretax` | N8 |
| Sales (`sale_management`) | Built | N1 |
| Purchase (`purchase`) | Built | N1 |
| Inventory (`stock`) | Built. Gap: reordering rules, routes, barcode; landed costs are in Community (`stock_landed_costs`) | L3 |
| Manufacturing (`mrp`) | Partial: job costing; no bills of materials or work orders | X5, L8 |
| Project (`project`) | Partial: contractor projects, RAB; no tasks or timesheets | L4 |
| Employees (`hr`) | Partial: the employee master for payroll | L2 |
| Expenses (`hr_expense`) | Partial: expense accruals; no employee claims | L5 |
| Contacts (`contacts`) | Partial: customer and vendor masters | L1 |
| CRM (`crm`) | Gap | L1 |
| Point of Sale (`point_of_sale`; `l10n_id_pos`, QRIS self-order) | Gap | X7 |
| POS Restaurant (`pos_restaurant`) | Gap | X7, then S5 F&B pack |
| Attendances (`hr_attendance`) | Gap | L2 |
| Time Off (`hr_holidays`) | Gap | L2 |
| Recruitment (`hr_recruitment`, `website_hr_recruitment`) | Gap | L7 |
| Skills (`hr_skills`) | Gap | L7 |
| Fleet (`fleet`) | Gap | L7 |
| Maintenance (`maintenance`) | Gap | L6 |
| Repair (`repair`) | Gap | L6 |
| To-Do (`project_todo`) | Gap | L9 |
| Discuss (`mail`) | Gap: the activity log covers audit only | L9 |
| Calendar (`calendar`) | Gap | L9 |
| Data Cleaning (`data_recycle`) | Gap | L10 |
| Lunch (`lunch`) | Gap | L10 |
| Website (`website`) | Gap | L10 |
| eCommerce (`website_sale`) | Gap | L10, X9 |
| eLearning (`website_slides`) | Gap | L10 |
| Live Chat (`im_livechat`) | Gap | L10 |
| Events (`website_event`) | Gap | L10 |
| Email Marketing (`mass_mailing`) | Gap | L10 |
| SMS Marketing (`mass_mailing_sms`) | Gap | L10 |
| Surveys (`survey`) | Gap | L10 |
| Marketing Card (`marketing_card`) | Gap | L10 |

Ahead of Community: payroll with PPh 21 TER and BPJS, fixed assets and budgets. Community has none of the three;
Odoo sells them in Enterprise. Also ahead: 288 reports verified against Accurate.

## 3. Impact (impactfirst.co)

Source: impactfirst.co/id, read 2026-10-21. Legal entity PT Neo Multi Servindo, Jakarta. It sells "Impact ERP"
("AI-native ERP"), publishes no prices ("subscription or one-time, cloud or on-premise"), and offers a free demo and a
free review. Its "IT Transformation" page is `/id/odoo` and its resources include Odoo tutorials, which suggests an
Odoo-based delivery. They don't state this.

### Products (33)

| Group | Built | Partial | Gap |
|---|---|---|---|
| Core ERP | ERP, Accounting (Gap: consolidation, X8), Invoicing, Inventory, Purchasing, Sales | Order management (no multichannel), Project management (no timesheets), Mobile ERP (responsive web) | — |
| Supply chain | — | — | SCM, WMS, Logistics, TMS, Fleet, Barcode |
| CRM | — | — | CRM omnichannel, CRM, POS, eCommerce |
| Manufacturing | — | MRP (job costing) | MES, PLM, Quality assurance, CMMS |
| Human resources | Payroll (PPh 21, BPJS) | HR, Expense management | Attendance, Time tracking, Recruitment, LMS |
| Listed under industries | — | — | Document management, Knowledge base |

That makes 7 Built, 6 Partial and 20 Gap. Order of attack: barcode, CRM and POS (L3, L1, X7); HR (L2); then the
supply-chain and plant depth (S7).

### Industries (14)

| Industry | Northline today | Pack |
|---|---|---|
| Manufacturing | Manufaktur Demo profile, fixtures | S2 |
| Retail & wholesale | Retail Demo profile | S2 |
| Distribution | Trade Portal Demo profile | S2 |
| Real estate & construction | Kontraktor Demo profile, RAB | S2 |
| Minimarket, Pharmacy, Food production, Central kitchen, Textile & garment, Healthcare, Rental, Nonprofit, Logistics, Energy & natural resources | none | S5 |

### Services (11 distinct pages)

| Impact service | Northline equivalent | Next |
|---|---|---|
| System planning & implementation / ERP transformation | v2 enterprise co-build brief | S3 |
| IT transformation (Odoo) | Migration off Accurate or Odoo through Parallel Close and import | N4, N5 |
| Digital transformation; Strategy & organisation; HR transformation | v3 AI FDE brief (diagnostic, sprints) | S3 |
| Business process improvement (KPI/OKR, SOP) | v3 brief | S3 |
| Data & analytics; Analytics consulting | 291 reports, AI report panel (UI mock) | S3 |
| Continuous improvement | Support retainer (v1, v3 briefs) | S3 |
| Sales, marketing & growth; Operations & manufacturing | none | after S3 |

### Resources

| Impact resource | Northline | Next |
|---|---|---|
| Case studies | none; Parallel Close runs become them | S4 |
| Guides (digital transformation, ERP, warehouse, lean manufacturing, retail, startup, branding, digital marketing, UMKM) | none | S4 (ERP, Coretax, warehouse, manufacturing and UMKM first) |
| Odoo tutorials | Scalar API reference only | S4 tutorials |
| Blog, About, Career, Contact | none | S4 |
| Business directory (legal, CPA, notary, tax consultants) | none | S8 |

Where Northline wins against Impact:

- **Evidence:** zero-diff reports, and published benchmarks once ADR-0048 lands.
- **Prices:** a published price list (S1). Impact publishes none.
- **Ownership:** Northline owns its core, so there is no third-party per-user licence.
- **Local rules:** Indonesian payroll and tax are built in.
