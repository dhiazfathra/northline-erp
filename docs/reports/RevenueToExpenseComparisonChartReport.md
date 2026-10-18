# Grafik Pendapatan berbanding Biaya (`RevenueToExpenseComparisonChartReport`)

Group: Keuangan. Chart report (PNG only), Des 2030 – Feb 2031. Verified by transcribing [`captures/charts/RevenueToExpenseComparisonChartReport.png`](captures/charts/RevenueToExpenseComparisonChartReport.png) into [`fixtures/charts.json`](fixtures/charts.json); ERP: `apps/api/src/reports/financial-ratios.ts`, route `/api/reports/charts/*`; test `apps/api/test/financial-ratios.test.ts`.

Params: `startDate`, `endDate`. Per month (x `Bulan`): `Total Pendapatan` (revenue + other income) and `Total Biaya` (COGS + expenses + other expenses) of that month. Fixture-only data: diffed against the ERP ledger.
