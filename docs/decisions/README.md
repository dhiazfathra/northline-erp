# Architecture Decision Records

| # | Title | Status |
|---|-------|--------|
| [0001](0001-event-sourcing-for-ledger.md) | Event sourcing + CQRS for the ledger | Accepted |
| [0002](0002-hand-rolled-event-store-on-drizzle.md) | Hand-rolled event store on Drizzle | Accepted |
| [0003](0003-report-calculation-rules-from-accurate.md) | Report calculations follow Accurate's observed rules | Accepted |
| [0004](0004-account-aggregate.md) | Chart of accounts through an event-sourced Account aggregate | Accepted |
| [0005](0005-sales-documents-post-through-the-ledger.md) | Sales documents are plain tables that post through the ledger | Accepted |
| [0006](0006-fifo-inventory-costing.md) | FIFO inventory costing from stock movements | Accepted |
| [0007](0007-fixed-assets-and-month-end.md) | Fixed assets and the month-end depreciation process | Accepted |
| [0008](0008-return-costing.md) | Sales and purchase returns follow the sandbox's costing | Accepted |
| [0009](0009-ppn-on-sales-invoices.md) | PPN on sales invoices comes from the item's default tax | Accepted |
| [0010](0010-report-scope.md) | Payroll, job orders, manufacturing and access reports are out of scope | Accepted |
| [0011](0011-unlabeled-chart-verification.md) | Unlabeled charts are verified through their backing table report | Accepted |
| [0012](0012-foreign-currency-sales.md) | Foreign-currency sales post in IDR at the document's rate | Accepted |
| [0013](0013-demo-inclusive-totals.md) | Reports that total the whole sandbox are verified on our own movement | Accepted |
| [0014](0014-pph-reports-out-of-scope.md) | PPh withholding reports stay at spec | Accepted |
| [0015](0015-bank-integration-reports-out-of-scope.md) | Bank-integration reports stay at spec | Accepted |
| [0016](0016-cogs-monitoring-out-of-scope.md) | Monitoring HPP stays at spec | Accepted |
| [0017](0017-cloudflare-workers-and-neon-free-tier.md) | Production on Cloudflare Workers + Neon, sized for both free tiers | Accepted |
| [0018](0018-local-default-on-demand-production.md) | Local Postgres is the default; production deploys only on demand | Accepted |
| [0019](0019-activity-log.md) | Log Aktifitas (activity log) is in scope, written with every change | Accepted |
| [0020](0020-scalar-api-reference.md) | Scalar API reference generated from the live route table | Accepted |
| [0021](0021-retail-report-module-dependencies.md) | Module dependencies surfaced by Retail Demo reports; proposed build order | Accepted |
| [0022](0022-branch-department-project-dimensions.md) | Branch on journal, department and project on journal line | Accepted |
| [0023](0023-salesmen-on-sales-lines.md) | Salesmen on sales lines, commission rules, salesman targets, check-ins | Accepted |
| [0024](0024-batch-serials-transfers-warehouses.md) | Batch serials with expiry, transfer lines and receipts, warehouse master, vendor price end date | Accepted |
| [0025](0025-budgets.md) | Budgets (Anggaran) per month and scope; budget-vs-actual Laba/Rugi | Accepted |
| [0026](0026-job-costing.md) | Job costing: job orders, expenses and roll-over (Pekerjaan Pesanan) | Accepted |
| [0027](0027-sales-quotations.md) | Sales quotations; processed quantities from line links (quotation -> order -> invoice) | Accepted |
| [0028](0028-approval-workflow.md) | Approval workflow: rules, document approval state and approver steps | Accepted |
| [0029](0029-trade-portal-demo-divergences.md) | Trade Portal Demo divergences: empty-array parameters, flat chart of accounts; P&L and trial balance re-verified | Accepted |
| [0030](0030-trade-portal-module-dependencies.md) | Module dependencies surfaced by Trade Portal Demo, proposed build order | Proposed (review) |
| [0031](0031-business-profiles-and-costing-method.md) | Business profiles (Manufaktur, Retail, Trade Portal) and configurable FIFO/average costing | Costing accepted; profiles proposed |
| [0032](0032-dedicated-instance-per-customer.md) | One dedicated instance (Worker + Neon project) per paying customer before multi-tenancy | Proposed (review) |
| [0033](0033-core-and-client-extensions.md) | Generic modules in core, client-specific code in per-client extensions (co-build resale) | Proposed (review) |
| [0034](0034-kontraktor-module-dependencies.md) | Module dependencies surfaced by Kontraktor Demo (Contractor Projects), proposed build order | Proposed (review) |
| [0035](0035-kontraktor-demo-divergences.md) | Kontraktor Demo divergences: standard-style project P&L, Per Proyek budgets, Daftar Proyek | Accepted |
| [0036](0036-one-neon-branch-per-profile.md) | Production demo: one Neon branch per Data Usaha, one Worker repointed between them | Accepted |
