# Penjualan per Merek (`ViewSalesByBrandReport`)

Group: Penjualan. **Status: verified** (zero diff, 5 windows). Fixture: [`fixtures/sales-views.json`](fixtures/sales-views.json).
ERP: `apps/api/src/reports/receivables.ts` (`salesByBrand`); tests: `apps/api/test/adjustments.test.ts`, `receivables.test.ts`, `tax.test.ts`.
Default-params capture: [`captures/ViewSalesByBrandReport.json`](captures/ViewSalesByBrandReport.json).

## Parameters

`FROMTO` + `selectedBranch` (`[{"name":"[Semua Cabang]","id":null}]`).

## Layout

```
Merk Barang | Kuantitas | Penjualan
15 | 307.000          <- items without a brand: blank brand name cell is dropped
```
One row per brand, no total row. NL items have no brand; the ERP has no brands yet, so all sales fall in the blank row.

## Calculation rules (shared by the three item views)

- Source: sales invoice lines dated in range at **DPP**: line total after line discount, less the line's pro-rata share
  of the invoice discount, without PPN (T19: 1.000.000 + 641.250 + 400.000 = 2.041.250 for 15 units). Sales returns
  count negative (Dec 2033: −2 units, −42.000). Linked SO→DO→SI sales count once, on the invoice.
- Items grouped by item, ordered by name. Down-payment invoices are excluded.
- Header dates spell August "Agu".
