# Penjualan Barang per Cabang (`ViewSalesItemByBranchReport`)

Group: Penjualan. **Status: verified** (zero diff, 5 windows). Fixture: [`fixtures/sales-views.json`](fixtures/sales-views.json).
ERP: `apps/api/src/reports/receivables.ts` (`salesItemByBranch`); tests: `apps/api/test/adjustments.test.ts`, `receivables.test.ts`, `tax.test.ts`.
Default-params capture: [`captures/ViewSalesItemByBranchReport.json`](captures/ViewSalesItemByBranchReport.json).

## Parameters

`FROMTO` + `selectedBranch` (`[{"name":"[Semua Cabang]","id":null}]`).

## Layout

```
Barang & Jasa | Satuan | Kantor Pusat | Total Nama Cabang
Kuantitas | Penjualan | Kuantitas | Penjualan
NL-T2 Jasa Konsultasi | Jam | 21 | 3.550.000 | 21 | 3.550.000
Total Barang & Jasa | 21 | 3.550.000 | 21 | 3.550.000
```
All items including services; one column pair per branch (only Kantor Pusat in the sandbox) plus the total.

## Calculation rules (shared by the three item views)

- Source: sales invoice lines dated in range at **DPP**: line total after line discount, less the line's pro-rata share
  of the invoice discount, without PPN (T19: 1.000.000 + 641.250 + 400.000 = 2.041.250 for 15 units). Sales returns
  count negative (Dec 2033: −2 units, −42.000). Linked SO→DO→SI sales count once, on the invoice.
- Items grouped by item, ordered by name. Down-payment invoices are excluded.
- Header dates spell August "Agu".
