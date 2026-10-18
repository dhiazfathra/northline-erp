# ADR-0005: Sales documents are plain tables that post through the ledger

## Status
Accepted

## Date
2026-10-18

## Context
The Piutang and Penjualan reports need invoices, receipts, customers and items. ADR-0001 event-sources only the ledger
(Journal, Period, Account). Accurate's own sales documents each produce one journal (fixture `sales-t2.json`):
an invoice debits the customer's receivable account and credits each item's sales account, merged per account; a receipt
debits the chosen cash/bank account and credits receivables. GL reports print the document type ("Faktur Penjualan",
"Penerimaan Penjualan") and the document number as the journal number.

## Decision
- `customers`, `items`, `sales_invoices(+lines)`, `sales_receipts(+lines)` are plain tables with a generic `audit_log` trigger.
- Creating a document runs in one transaction: validate, insert rows, and post its journal with `handleTx` (the ledger
  command handler inside the caller's transaction). The journal carries `sourceType` (`SI`, `SR`; `JV` for manual) and the
  document number. Commands are idempotent per key, like ledger commands.
- Numbers follow Accurate: `SI.yyyy.mm.nnnnn`; receipts `<bank account no>.yyyy.mm.nnnnn`, per prefix and month.
- Receivable reports read the document tables; ledger reports keep reading projections.
- Receipts may not exceed an invoice's remaining balance (checked with the invoice row locked).

## Alternatives Considered
- **Event-source invoices and receipts now**: full history per document, but doubles the build before any report needs
  document history. Revisit when edits/voids of posted documents are implemented (they will be reversal journals either way).
- **Reports from journals only**: loses due dates, item lines and invoice-to-payment links that Faktur Belum Lunas and
  Umur Piutang need.

## Consequences
- `JournalPosted` gained an optional `sourceType`; old events read as `JV` (no upcaster needed).
- Editing or deleting a posted document is not supported yet; it will post a reversal and a new journal.
- Payment terms are not modelled: due date defaults to the invoice date (the sandbox's default term).
