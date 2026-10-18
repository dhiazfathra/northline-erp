# Histori Proses Penjualan (`SalesFlowHistoryReport`)

Group: Penjualan. **Status: spec captured, not yet verified** (no seeded fixture or ERP implementation yet).
Capture: [`captures/SalesFlowHistoryReport.json`](captures/SalesFlowHistoryReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `FROMTO`; request param used: `{"startDate":"01/01/2026","endDate":"18/10/2026"}`.



## Layout

View: `report`. Header lines: "Dari 01 Jan 2026 s/d 18 Okt 2026".


First table row (columns): `Penawaran Penjualan | Pesanan Penjualan | Pengiriman Pesanan | Uang Muka Penjualan | Faktur Penjualan | Retur Penjualan | Penerimaan Penjualan | Tukar Faktur`

## Open work

- Seed transactions that exercise this report, record calculation rules, add a zero-diff ERP test.
