# ADR-0030: Module dependencies surfaced by Trade Portal Demo, and proposed build order

## Status
Proposed. Flagged for the principal's review; the order below is a proposal, not a decision.

## Date
2026-10-19

## Context
The goal brief says the ERP event-sources only Journal and Period. That is out of date (ADR-0021): Sales,
Purchasing, Inventory (FIFO), Cash & Bank, Fixed Assets, Tax, Payroll, dimensions, budgets, job costing,
quotations and approvals all post through the ledger, and every Daftar Laporan entry is already specified and
verified on Manufaktur Demo or Retail Demo.

Trade Portal Demo adds no report (ADR-0029), so it surfaces no new required module. What it does show:
- Its accounts include a payment gateway (`Bank Xendit Demo`, `Beban Xendit Demo`, `Pajak Xendit Demo`). No report
  needs a gateway module: settlements post as ordinary Cash & Bank journals.
- 4 reports fail in Accurate itself for this Data Usaha (ADR-0029 finding 2). They need investigation, not a module.

## Proposed order (for review)
1. **Re-verify inventory reports on Trade Portal** (Inventory Aging, Warehouse Mutation, Serial Aging): Trade Portal
   returns stock data for them; seed NL-TP items and compare. No new module.
2. **Investigate the 4 failing reports** in the Trade Portal UI.
3. **Payment gateway / online-portal integration** (Xendit-style settlement): only if the business wants portal
   orders to flow in; no Daftar Laporan report requires it.

## Alternatives Considered
- **Deciding the order here**: rejected; the goal reserves the build order for the principal.

## Consequences
- Until reviewed, nothing in this ADR is scheduled. `_coverage.md` lists no report as blocked.
