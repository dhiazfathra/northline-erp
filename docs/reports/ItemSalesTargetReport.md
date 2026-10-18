# Target Penjualan Barang (`ItemSalesTargetReport`)

Group: Penjualan. **Status: verified** (zero diff). Fixture: [`fixtures/targets-t21.json`](fixtures/targets-t21.json) (sales from `tax-t19.json`).
ERP: `apps/api/src/reports/targets.ts` (`itemTargets`); test: `apps/api/test/tax.test.ts`.
Default-params capture: [`captures/ItemSalesTargetReport.json`](captures/ItemSalesTargetReport.json).

## Parameters

`ASOFYEAR`: `{"asOfYear":2035,"selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`. Targets of that year.

## Layout

Per ITEM_TARGET of the year: `Nama Barang Barang & Jasa | Kuantitas | Nilai Target | Kts Riil | Nilai Riil | Pencapaian Kts (%) | Pencapaian (%)`; header gives Nama Target, S/d Tanggal, Dari Tanggal, Penganalisa.

## Calculation rules

Source: Target Penjualan (Preferensi > **Anggaran dan Target** must be on; module `accurate__budget-target__sales-target`).
Riil = sales at DPP (after line and invoice discounts, no PPN, returns negative) in the target's range, the same
figure as the sales item views (2.041.250 for Nov 2035). Pencapaian (%) = Riil / Target x 100 to two decimals,
trailing zeros dropped ("75", "81,65", "0"). Each target prints its own block (title repeated), then a totals row
(Target, Riil).
