# Grafik Penjualan Bulanan (`AnnualSalesChartReport`)

Group: Penjualan. Chart report: Accurate renders only a PNG (HTML and XLS export embed the image). Verified by transcribing the labels of [`captures/charts/AnnualSalesChartReport-t4.png`](captures/charts/AnnualSalesChartReport-t4.png) into [`fixtures/charts.json`](fixtures/charts.json); test in `apps/api/test/inventory.test.ts`.

Bar per month (x `Bulan`, y `Penjualan`), bar label = invoice totals of the month (`Okt 2033` 160.000, `Nov 2033` 147.000). ERP: `monthlySalesChart`.
