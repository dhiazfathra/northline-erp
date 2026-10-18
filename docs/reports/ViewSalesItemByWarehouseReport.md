# Penjualan Barang per Gudang (`ViewSalesItemByWarehouseReport`)

Group: Penjualan. **Status: verified** (zero diff, 5 windows). Fixture: [`fixtures/sales-views.json`](fixtures/sales-views.json).
ERP: `apps/api/src/reports/receivables.ts` (`salesItemByWarehouse`); tests: `apps/api/test/adjustments.test.ts`, `receivables.test.ts`, `tax.test.ts`.
Default-params capture: [`captures/ViewSalesItemByWarehouseReport.json`](captures/ViewSalesItemByWarehouseReport.json).

## Parameters

`FROMTO` + `selectedBranch` (`[{"name":"[Semua Cabang]","id":null}]`).

## Layout

```
Nama Barang | Gudang | Kuantitas | Penjualan
NL-T4 Barang A | Utama | 15 | 307.000
Total Gudang | 15 | 307.000          <- per item, after its warehouse rows
Total Nama Barang | 15 | 307.000     <- grand total
```
Only stock items (services have no warehouse): the T2 and T19 windows (services only) print no rows and **no column
header**. Warehouse = the line's shipping warehouse; the ERP prints Utama for all (`shortcut:` in the code).

## Calculation rules (shared by the three item views)

- Source: sales invoice lines dated in range at **DPP**: line total after line discount, less the line's pro-rata share
  of the invoice discount, without PPN (T19: 1.000.000 + 641.250 + 400.000 = 2.041.250 for 15 units). Sales returns
  count negative (Dec 2033: −2 units, −42.000). Linked SO→DO→SI sales count once, on the invoice.
- Items grouped by item, ordered by name. Down-payment invoices are excluded.
- Header dates spell August "Agu".
