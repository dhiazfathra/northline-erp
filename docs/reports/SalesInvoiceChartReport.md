# Grafik Penjualan (`SalesInvoiceChartReport`)

Group: Penjualan. **Status: verified via backing table** (ADR-0011). Fixture: [`fixtures/charts.json`](fixtures/charts.json) (`SalesInvoiceChartReport`),
image [`captures/charts/SalesInvoiceChartReport-t4.png`](captures/charts/SalesInvoiceChartReport-t4.png).
ERP: `apps/api/src/reports/receivables.ts` (`salesInvoiceChartPoints`); test: `apps/api/test/inventory.test.ts` ("sales charts").
Backing labeled series: Grafik Penjualan Bulanan (`AnnualSalesChartReport`, `monthlySalesChart`).

## Parameters

`YEARTODATE` with explicit range: `{"startDate":"01/10/2033","endDate":"31/12/2033","selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`.
The PNG comes from `runReport(app, id, param, { view: 'xls' })` (xlsx embedding `xl/media/*.png`).

## Layout and rules

An unlabeled line chart with a daily x-axis ("2-Oct" ... "1-Nov") and amounts on y. One point per month that has sales
invoices, plotted on the month's **first day**; value = that month's invoice totals: 160.000 (1 Oct 2033), 147.000
(1 Nov 2033), the same as the labeled monthly bars. December 2033 has only a sales return and no invoice, so no point.
