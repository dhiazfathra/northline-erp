# ADR-0008: Sales and purchase returns follow the sandbox's costing

## Status
Accepted

## Date
2026-10-18

## Context
Returns move receivables/payables and stock. Observed in the sandbox (fixture `returns-t6.json`, built on `inventory-t4.json`):
- Sales return of 2 units sold at 21.000: Dr Retur Penjualan 42.000 / Cr Piutang 42.000, and stock back at **14.600 per unit**,
  the latest purchase unit cost — not the FIFO cost the units left at (10.000/13.000): Dr Persediaan 29.200 / Cr HPP 29.200.
- Purchase return of 1 unit bought at 14.600: Dr Hutang 14.600 / Cr Persediaan **13.000** (FIFO cost of the oldest layer) /
  Cr HPP 1.600 (the difference).

## Decision
- `sales_returns`/`purchase_returns` (+lines) are plain documents against one invoice (Accurate's default "INVOICE" type),
  posting through `handleTx` with sources `SRT`/`PRT`, numbered `SRT.yyyy.mm.nnnnn` / `PRT.yyyy.mm.nnnnn`.
- Returned quantity may not exceed the invoiced quantity less earlier returns.
- Sales returns of stock items enter a new FIFO layer at the latest purchase unit cost; purchase returns consume FIFO
  layers and book price − cost to HPP (credit when positive, debit when negative).
- Receivable/payable reports treat returns as reductions of the invoice's owing and show them in the "Retur" column.

## Consequences
- An item never purchased cannot be returned by a customer (no cost to use); the API refuses it explicitly.
- Returns without an invoice ("DELIVERY"/no-reference types) are not modelled.
