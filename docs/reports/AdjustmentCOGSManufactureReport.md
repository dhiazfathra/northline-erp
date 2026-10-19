# Penyesuaian Bahan (Harga Pokok Produksi) (`AdjustmentCOGSManufactureReport`)

Group: Manufaktur. **Status: verified** on Manufaktur Demo (P3.3): fixture [`fixtures/manufacturing-m49.json`](fixtures/manufacturing-m49.json) (on top of `fixtures/jobcosting-m49.json`), test `apps/api/test/manufacturing.test.ts`, months Jan, Feb and Mar 2049.
Capture: [`captures/AdjustmentCOGSManufactureReport.json`](captures/AdjustmentCOGSManufactureReport.json), run with default parameters over the sandbox demo data.

## Parameters

Date parameter kind: `PERIOD`; request param used: `{"periodMonth":"10","periodYear":2026}`.



## Layout

View: `report`. Header lines: "Per Oktober 2026".


First table row (columns): `Tipe Transaksi | Nomor # | Nama Barang | Nilai Masuk | Nilai Keluar | Nilai`

## Calculation rules (verified 2026-10-19)

The report does not need the Manufaktur feature: it lists the month's stock movements of all items at cost.
- Rows: every other stock movement: Penyesuaian Persediaan, Faktur Penjualan, Retur Penjualan, Pekerjaan Pesanan, Penambahan Bahan Baku, Penyelesaian Pesanan. Pembelian (HPP) and Penyesuaian Bahan (HPP) split the movements between them.
- Section label "Penyesuaian Bahan", then per date: the date line, one row per movement line (Tipe Transaksi, Nomor #, Nama Barang, Nilai Masuk, Nilai Keluar, Nilai = masuk - keluar), and a subtotal row. A grand total row closes the report.
- Values are the movement's cost: an incoming line is Nilai Masuk, an outgoing line Nilai Keluar (a material return into stock is incoming).
- A month without movements prints only the column header.
- Not captured: Penerimaan Barang and Pemindahan Barang (the ERP leaves transfers out and puts receipts with the adjustments).

ERP: `loadCostMoves`, `adjustmentCogsManufacture` (`apps/api/src/reports/cogs-manufacture.ts`), route `GET /api/reports/manufacturing/adjustment-cogs?from&to` (one month).
