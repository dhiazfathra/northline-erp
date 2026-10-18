# Grafik Rata-rata Pembayaran Pelanggan (`OwingCollectionGraphReport`)

Group: Piutang. Chart report (PNG only). Verified by transcribing the labels of [`captures/charts/OwingCollectionGraphReport.png`](captures/charts/OwingCollectionGraphReport.png) into [`fixtures/charts.json`](fixtures/charts.json).

One bar per month in range (x `Bulan`, y `Bayar (Hari)`): average days from invoice date to each receipt dated that month, **partial payments included** (May: R1 paid I1 after 35 days; June: R2 after 56), months without receipts 0. Unlike the [table version](OwingCollectionPerCustomerReport.md), which counts only fully settled invoices. ERP: `collectionDaysChart`.
