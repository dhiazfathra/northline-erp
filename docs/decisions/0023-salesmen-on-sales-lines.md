# ADR-0023: Salesmen on sales lines, commission rules, salesman targets and check-ins

## Status
Accepted 2026-10-19

## Context
ADR-0021 listed 14 Retail Demo "Tenaga Penjual" reports as blocked on a salesman model. Seeding NL-RC documents in the
Retail Demo sandbox (2043, `docs/reports/fixtures/retail/salesman-rc.json`) showed how Accurate models it:

- The salesman sits on the **invoice line** (`salesmanListId`, up to five, in order: level 1..5). The header's
  `masterSalesman` is derived: set only when all lines carry the same salesmen. Reports that list documents per
  salesman (aging, outstanding, invoice and return lists) use that derived salesman; reports about sales value
  (by item, targets, transaction history, commissions) credit every salesman on a line with the whole line.
- A return line points at the invoice line it takes back and inherits its salesmen.
- Commission rules (Komisi Penjual) pay a percent of the line value to chosen levels of chosen (or all) salesmen,
  earned when the invoice is fully settled (dated by the settling receipt) and reversed on the return date.
- Sales targets "Per Penjual" are the existing Target Penjualan with one amount per salesman.
- Check-ins exist only in the mobile app; the web app cannot create them and the API needs an OAuth token.

## Decision
- Table `salesmen` (no, name). Invoice lines get `salesmen text[]` (array order = level). Return lines get
  `invoice_seq`, the returned invoice line. Input: `lines[].salesmen` on invoices, `lines[].invoiceSeq` on returns.
- `salesman_commissions` (name, percent, levels, salesmen or NULL for all): the only rule shape seen (all items, no
  conditions, percent of sales value). `sales_targets.kind` gains `SALESMAN` with `sales_target_lines.salesman_no`.
- `sales_check_ins` holds imported check-ins (no ERP UI creates them, as in Accurate).
- No journal or ledger change: salesmen do not post. Reports live in `apps/api/src/reports/salesman.ts` over a
  dedicated loader; services in `apps/api/src/sales/salesmen.ts`.

## Alternatives Considered
### Salesman on the invoice header
- Pros: one column, simpler reports
- Cons: cannot express a shared line or level-based commission; Accurate's header salesman is derived
- Rejected: the NL-RC fixture's shared line splits commissions by level

### Commission postings in the ledger
- Rejected: Accurate's commission reports are calculations, not journals; nothing posts.

## Consequences
- 14 reports verified zero-diff on NL-RC blocks (`apps/api/test/salesman.test.ts`); SalesCheckInPerSalesmanReport only
  on its empty layout.
- Unobserved and implemented by assumption (marked in code/specs): `Blm Tempo` for age <= 0, a return on an invoice
  that is never settled, commission conditions/other rule types, check-in rows with data.
- The sandbox's own 2016-17 receivables appear in as-of reports; their rows and the totals including them are not
  compared.
