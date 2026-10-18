# ADR-0009: PPN on sales invoices comes from the item's default tax

## Status
Accepted

## Date
2026-10-18

## Context
The Pajak reports (Daftar PPN/PPnBM Keluaran, SPT Masa PPN, Rekonsiliasi PPN) need taxed invoices. Observed in the sandbox
(fixture `tax-t19.json`):
- Accurate applies PPN per invoice line from the **item's default tax**. An invoice marked taxable whose items have no
  tax saves with no PPN at all.
- DPP = line totals (after line discount) less the invoice discount; PPN = DPP × rate, rounded half-up to the rupiah.
- The journal debits the receivable for the taxed total, debits the invoice- and line-discount accounts, credits the
  tax's sales account (PPN Keluaran) and credits sales at the **gross** price.

## Decision
- `taxes.sales_account` holds each tax's output-tax account; `items.tax_name` and `items.sales_discount_account` hold the
  item defaults (migration 0022).
- `createSalesInvoice` takes `taxable`, per-line `discPct`, invoice `discPct` and `discountAccount`. It computes DPP/PPN
  per tax and stores them in `sales_invoice_taxes`, so tax reports read one row per invoice and tax.
- `sales_invoices.total` stays "what the customer owes" and now includes PPN, so receivable reports need no change.
- Untaxed invoices without discounts post exactly as before (all 172 earlier tests unchanged).

## Alternatives Considered
- **Tax chosen per invoice line by the caller**: simpler input, but it diverges from Accurate, where the item decides.
  The acceptance spec is Accurate's behaviour, so we follow the item default.
- **Derive PPN in the reports from journals**: no extra table, but DPP and per-invoice rate are not recoverable from the
  journal once lines are merged per account.

## Consequences
- Multi-line, multi-tax rounding is not yet observed; the pro-rata discount split is marked with a `shortcut:` comment.
- Purchase-side PPN Masukan is still open: script saves of purchase invoices fail server-side in Accurate (see handoff).
