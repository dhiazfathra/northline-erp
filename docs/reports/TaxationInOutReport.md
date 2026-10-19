# Rekonsiliasi PPN Lebih/Kurang Bayar (`TaxationInOutReport`)

Group: Pajak. **Status: verified** (zero diff). Fixture: [`fixtures/tax-t19.json`](fixtures/tax-t19.json).
ERP: `apps/api/src/reports/tax.ts` (`taxationInOut`); test: `apps/api/test/tax.test.ts`.
Default-params capture: [`captures/TaxationInOutReport.json`](captures/TaxationInOutReport.json).

## Parameters

`FROMTO`: `{"startDate":"dd/MM/yyyy","endDate":"dd/MM/yyyy"}`.

## Layout

```
PPN Lebih/Kurang Bayar
Pajak Masukan / PPN Masukan / Saldo Awal / - | - | 220.000 / -220.000
Total dari PPN Masukan | -220.000 / Total dari Pajak Masukan | -220.000
Pajak Keluaran / PPN Keluaran / Saldo Awal / - | - | 628.100 / 628.100
ZZ-R01-PPN 11% (11%) / SI rows ... / 180.538
Total dari PPN Keluaran | 808.638 / Total dari Pajak Keluaran | 808.638
Pajak Masukan / PPN Masukan / ZZ-R01-PPN 11% (11%) / 12 Nov 2035 | 12 Nov 2035 | PI.2035.11.00001 | 66.000 / -66.000
Total dari PPN Masukan | -66.000 / Total dari Pajak Masukan | -66.000
Total dari PPN Lebih/Kurang Bayar | 522.638
```

The printout spans two pages; title, date range and column header repeat on page 2 (stripped as page chrome).

## Calculation rules

- Grand total = PPN Keluaran (opening + period) − PPN Masukan (opening + period): 808.638 − 220.000 − 66.000 = 522.638
  (positive = kurang bayar, tax payable).
- Entry order: entries sorted by tax name with the openings (no tax name) first, Masukan opening before Keluaran opening;
  within one tax, the Keluaran block precedes the Masukan block. A "Pajak …" + "PPN …" heading and its two totals are
  printed for each run of same-side entries, so Masukan appears twice.
- Masukan amounts print positive on document rows and the opening row, negative in block subtotals and totals.

## Open work

- Entry order is inferred from one tax; confirm with two taxes on both sides (`shortcut:` comment in `taxationInOut`).

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop). Verified (zero diff) over 1 Jan - 31 Mar, March, April and 1 Jan - 30 Apr 2045, fixture [fixtures/trade/trade-tp.json](fixtures/trade/trade-tp.json) (`tax`), test `apps/api/test/trade-portal-trade.test.ts`; seed adds JV.2045.04.00001 (PPN Masukan 300.000 D, PPN Keluaran 500.000 C). Sections are tax accounts on both sides (Pajak Masukan: PPN Masukan, Persediaan Terkirim; Pajak Keluaran: PPN Keluaran, Persediaan). **Stream rule**: (1) every account's Saldo Awal, Masukan accounts then Keluaran, each followed by its sales-invoice Transaksi Lainnya; (2) per tax its Keluaran then Masukan block (merges with run 1, as in Manufaktur Demo); (3) the remaining Transaksi Lainnya, Masukan then Keluaran, always in a new run. A side heading prints when the side changes or run 3 starts, an account heading when the account changes; each run closes with `Total dari <account>` and `Total dari Pajak ...` over that run only. Masukan rows print positive, their totals negative. The sale's HPP is pinned at FIFO (blocked: requires average costing). ERP: `taxationInOutBySection`. See ADR-0029.
