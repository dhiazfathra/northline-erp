# ADR-0006: FIFO inventory costing from stock movements

## Status
Accepted

## Date
2026-10-18

## Context
The Persediaan reports and every sales invoice of a stock item depend on the costing method. The sandbox costs by FIFO
(fixture `inventory-t4.json`): after buying 10 @ 10.000 and 10 @ 13.000, selling 8 costs 80.000; after buying 5 @ 14.600,
selling 7 costs 2 × 10.000 + 5 × 13.000 = 85.000. Invoices then carry Dr Beban Pokok Penjualan / Cr Persediaan after the
sales lines; purchases of stock items debit the item's inventory account instead of an expense account.

## Decision
- A `stock_moves` table holds every movement (item, date, document, quantity ±, cost value ±). FIFO layers are derived
  from it in (date, id) order (`apps/api/src/inventory/fifo.ts`); a sale consumes the oldest layers and stores its cost.
- Costs are computed when the document posts, inside the same transaction as its journal (ADR-0005), and rounded to whole
  cents per layer consumed.
- Selling more than the stock on hand is rejected.
- Items gain `inventory_account` and `cogs_account`; stock items require both.

## Alternatives Considered
- **Average cost**: Accurate supports it per company; the sandbox uses FIFO, and the acceptance spec follows the sandbox.
  A per-company setting can switch `fifoCost` for an average when a tenant needs it.
- **Store layers as their own table**: faster for long histories, but a second source of truth; derive until volume demands it.

## Consequences
- Documents must post in date order. A back-dated movement would mis-cost later sales; editing/back-dating needs a
  re-cost job (marked as a shortcut in `fifo.ts`).
- One warehouse ("Utama") and one unit per item for now; multi-warehouse reports stay at spec status.
