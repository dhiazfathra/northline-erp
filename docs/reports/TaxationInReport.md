# Daftar PPN/PPnBM Masukan (`TaxationInReport`)

Group: Pajak. **Status: verified** (zero diff). Fixture: [`fixtures/tax-t19.json`](fixtures/tax-t19.json).
ERP: `apps/api/src/reports/tax.ts` (`taxationIn`); test: `apps/api/test/tax.test.ts`.
Default-params capture: [`captures/TaxationInReport.json`](captures/TaxationInReport.json).

## Parameters

`FROMTO`: `{"startDate":"dd/MM/yyyy","endDate":"dd/MM/yyyy"}`.

## Layout and rules

Same layout and rules as [Daftar PPN/PPnBM Keluaran](TaxationOutReport.md), over taxable **purchase** invoices, with
"PPN Masukan" in the section and total labels:

```
PPN Masukan / Saldo Awal / - | - | 220.000 / 220.000
ZZ-R01-PPN 11% (11%)
12 Nov 2035 | 12 Nov 2035 | PI.2035.11.00001 | 66.000
66.000
Total dari PPN Masukan | 286.000
```

- PPN Masukan = DPP × rate, rounded to the rupiah, from each line's item default tax when the invoice is taxable.
- Journal (AllJournalReport): Dr expense/inventory per line, Dr PPN Masukan (the tax's purchase account, 110504),
  Cr Hutang for the taxed total.
- Saldo Awal 220.000 over the sandbox is the demo data's PPN Masukan (PI.2026.10.00001/00003).

## Open work

- Purchase discounts and PPh 23 (`tax3`, seen on the demo purchase invoice) are not modelled.

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop). Four windows Jan - Apr 2045, fixture [fixtures/trade/trade-tp.json](fixtures/trade/trade-tp.json) (`tax`), test `apps/api/test/trade-portal-trade.test.ts`: zero diff. One section per tax *purchase account* (PPN Masukan 110504; Persediaan Terkirim 110402 for PPnBM), same rules as Daftar PPN/PPnBM Keluaran's Trade variation; JV.2045.04.00001 prints as Transaksi Lainnya with its own number as faktur, amount debit - credit. See ADR-0029.
