# Grafik Harta Bersih (`NetWorthChartReport`)

Group: Keuangan. Chart report (PNG only), Des 2030 – Feb 2031. Verified by transcribing [`captures/charts/NetWorthChartReport.png`](captures/charts/NetWorthChartReport.png) into [`fixtures/charts.json`](fixtures/charts.json); ERP: `apps/api/src/reports/financial-ratios.ts`, route `/api/reports/charts/*`; test `apps/api/test/financial-ratios.test.ts`.

Params: month range. Per month end: `Total Aset` (JUMLAH ASET), `Total Kewajiban` (Jumlah Kewajiban), `Harta Bersih` (Jumlah Ekuitas). Whole-company balances: checked against Accurate's own statement totals.
