# Porsi Penjualan per Pelanggan (`TopSalesCustomerChartReport`)

Group: Penjualan. Chart report: Accurate renders only a PNG (HTML and XLS export embed the image). Verified by transcribing the labels of [`captures/charts/TopSalesCustomerChartReport-t4.png`](captures/charts/TopSalesCustomerChartReport-t4.png) into [`fixtures/charts.json`](fixtures/charts.json); test in `apps/api/test/inventory.test.ts`.

Pie; legend `<customer> - <sales> (<pct>%)`, largest first, whole-number percent (160.000 of 307.000 → 52%). ERP: `customerShareChart`.
