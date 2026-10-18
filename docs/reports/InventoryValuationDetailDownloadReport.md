# Rincian Nilai Persediaan (CSV) (`InventoryValuationDetailDownloadReport`)

Group: Persediaan. **Status: verified** (zero diff: NL-T33-SN Nov 2036 and May 2036 exactly; NL-T4-B1 moves relative to its opening). Fixture: [`fixtures/serial-t33.json`](fixtures/serial-t33.json) (`InventoryValuationDetailDownloadReport`).
ERP: `apps/api/src/reports/inventory.ts` (`inventoryValuationCsv`); test: `apps/api/test/purchases-2036.test.ts`.

## Parameters

`startDate` / `endDate`. View `download`. The download page's preview shows only 10 rows and has no item column. The full
report is the zip at `computed.downloadLink`, which holds `manifest.txt` and one `report/<item no>.csv` per stock item,
including items with no move. `runReport(..., { view: 'csv' })` returns it base64 in `zip`.

## Layout

Per item file: `Nomor #, Tanggal, Kts Masuk, Nilai Masuk, Kts Keluar, Nilai Keluar, Kts Akhir, Nilai Akhir`.

## Calculation rules

- First row: no number, dated the day before the start, with the opening quantity and value as "Masuk" and as "Akhir"
  (zeros when the item has no history).
- Then one row per stock move in the window, by date: incoming moves fill Masuk and outgoing moves fill Keluar. Akhir
  is the running quantity and value.
- Values are plain rupiah. T33: `PI.2036.11.00001, 2036-11-01, 2, 100000, 0, 0, 2, 100000`. T25 (May 2036, NL-T4-B1):
  two purchase rows of 1 x 10.000 each, with Akhir 22/326000 and 23/336000.

## Open work

- Outgoing moves and items with fractional costs are not captured in this export.
