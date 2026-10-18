# Cicilan Belum Terbayar (`SalesInvoiceUnpaidInstallmentListReport`)

Group: Penjualan. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/SalesInvoiceUnpaidInstallmentListReport.json`](captures/SalesInvoiceUnpaidInstallmentListReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `ASOF`; request param used: `{"asOfDate":"18/10/2026"}`.



## Layout

View: `report`. Header lines: "Per Tgl. 18 Okt 2026".


First table row (columns): `Pelanggan | No Faktur # | Tanggal Cicilan | Nama Cicilan | Jumlah | Bayar | Tanggal Bayar`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
