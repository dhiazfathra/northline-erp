# ADR-0016: Monitoring HPP stays at spec

## Status
Accepted (extends [ADR-0010](0010-report-scope.md))

## Date
2026-10-18

## Context
Monitoring HPP (`CogsMonitoringReport`) reads an `hpp.*` data source (`unitPrice`, `purchaseCost`, `purchaseCostBefore`,
`unitPurchaseBefore`) that looks like a log of purchase-cost changes. It stayed empty in every state tried in the sandbox:
- vendor prices (VPA) and selling price adjustments (SPA), dated 2036 and dated 2026 before the run date
- item-master prices (`unitPrice`, `vendorPrice`, preferred vendor) on a new item
- purchases of that item, before and after switching on `featureVendorPrice`
- item-category parameters

Nothing found so far writes to that log. The user chose to keep the report out of scope (2026-10-18).

## Decision
`CogsMonitoringReport` stays at spec, with the findings in its doc.

## Consequences
- Revisit if Accurate documents what feeds Monitoring HPP (likely a background job or a feature not in this edition).
