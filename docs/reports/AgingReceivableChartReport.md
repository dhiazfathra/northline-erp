# Grafik Umur Piutang (`AgingReceivableChartReport`)

Group: Piutang. Chart report (PNG only). Verified by transcribing the labels of [`captures/charts/AgingReceivableChartReport.png`](captures/charts/AgingReceivableChartReport.png) into [`fixtures/charts.json`](fixtures/charts.json).

Params: `asOfDate`. One bar per **non-empty** age bucket (x `Grup Umur`, y `Piutang`) of all open receivables, buckets as [Umur Piutang](AgingReceivableReport.md). The > 120 bar (5.020.000) is the sandbox's own 2026 data; the test checks the fixture buckets. ERP: `agingChart`; test `receivables.test.ts`.
