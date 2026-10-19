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

Source: Trade Portal Demo (PT Automotive Shop). **Partial.** Trade Portal capture (fixtures/trade/trade-tp.json `ledgerQ1`) uses the account sections above on both sides (Pajak Masukan: PPN Masukan, Persediaan Terkirim; Pajak Keluaran: PPN Keluaran, Persediaan). It prints the Persediaan purchase group after the section totals under a repeated `Pajak Keluaran / Persediaan` heading, so the streaming order is not determinable from one capture. Not built for multi-account sections; the Manufaktur Demo layout stays verified. See ADR-0029.
