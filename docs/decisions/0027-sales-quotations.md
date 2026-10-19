# ADR-0027: Sales quotations, and processed quantities from document links

## Status
Accepted 2026-10-19

## Context
ADR-0021 listed four Retail Demo "Penawaran" reports as blocked on a Sales Quotation module, and the four "Pesanan"
reports as specified but unverified against the existing sales orders (migration 0016). Seeding NL-RD documents in the
Retail Demo sandbox (2044, `docs/reports/fixtures/retail/quotation-rd.json`) showed how Accurate models them:

- A quotation (Penawaran Penjualan) has no journal. A sales order line can be taken from a quotation line
  (`salesQuotationDetailId`); an invoice line from a sales order line (`salesOrderDetailId`).
- Status (`Menunggu diproses` / `Sebagian diproses` / `Terproses`) and `Kts Terproses` come from the quantities taken
  by those downstream lines. The `(Belum Proses)` reports drop `Terproses` documents and keep partly processed ones in
  full (totals are not reduced by the processed share).
- The sandbox PPN is 10%; Accurate refuses a taxed document dated after April 2022 with it, so the NL-RD documents are
  untaxed (Total = Sub Total).

## Decision
- Tables `sales_quotations` and `sales_quotation_lines`, shaped like the sales order tables; no journal.
- `sales_order_lines.(quotation_number, quotation_seq)` and `sales_invoice_lines.(order_number, order_seq)` link a line to
  the line it processes (foreign keys). Inputs: `lines[].quotation` on `createSalesOrder`, `lines[].order` on invoices.
- Status and processed quantities are derived in the report loader (`apps/api/src/reports/quotations.ts`), never stored.
  One set of report functions serves both document kinds (list, detail, per customer, per item).

## Alternatives Considered
### Stored status / processed quantity columns
- Rejected: they would need updating on every invoice edit or delete; the link is the single source.

### Header-level link (order -> quotation)
- Rejected: Accurate links per line, and a quotation can be processed in part (one line, or part of a quantity).

## Consequences
- 8 reports verified zero-diff over 2044 (`apps/api/test/quotations.test.ts`).
- Not modelled yet (shortcut comments in code): delivery orders as processed quantity, taxed quotations/orders,
  `No. PO`, charges (`Total Biaya`), foreign currency, manual closing (`Ditutup`).
