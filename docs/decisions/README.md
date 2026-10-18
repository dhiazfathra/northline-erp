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
