# ADR-0014: PPh withholding reports stay at spec

## Status
Accepted (extends [ADR-0010](0010-report-scope.md))

## Date
2026-10-18

## Context
The four PPh reports (`SalesInvoicePphPaidReport`, `SalesReceiptPPhReport`, `PurchaseInvoicePphPaidReport`,
`PurchasePaymentPPhReport`) need receipts or payments that withhold PPh. Scripted saves did not produce a PPh line:
- invoice lines with `tax3Id` (T29)
- receipts with `cutSalesPph`, `pphAmount` and `pphNumber` (T37)
- the receipt form's own model

Setting the flag shows no PPh fields. Capturing a hand-entered receipt was offered as the way forward. The user chose to
mark these reports out of scope instead (2026-10-18).

## Decision
The four PPh reports stay at spec, with their docs recording the T29/T37 findings. They are out of scope, as the ADR-0010
reports are.

## Consequences
- The ERP has no PPh withholding on receipts or payments.
- Revisit when PPh withholding is needed: capture one receipt entered in the UI with `capture-save.mjs`, then follow the
  usual seed and diff loop.
