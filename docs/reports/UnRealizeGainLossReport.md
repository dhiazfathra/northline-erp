# Laba/Rugi Tidak Terealisasi (`UnRealizeGainLossReport`)

Group: Buku Besar. **Status: verified** under [ADR-0013](../decisions/0013-demo-inclusive-totals.md) (zero diff on the header, currency and receivable rows and the receivable's figures;
the sandbox's two demo USD bank accounts are outside the ERP). Fixture: [`fixtures/fx-t31.json`](fixtures/fx-t31.json) (`t36`).
ERP: `apps/api/src/reports/receivables.ts` (`foreignOpenReceivables`, `unrealizedGainLoss`), loader `loadForeignOwing`
(migration 0039); test: `apps/api/test/fx.test.ts`.

## Parameters

`periodStartMonth` / `periodStartYear` / `periodEndMonth` / `periodEndYear`. Months are 1-based strings.

## Layout

`Nama Akun Perkiraan | Bulan | Nilai Asing | Nilai Domestik (Bulan) | Kurs Akhir Bulan | Nilai Domestik (Akhir Bulan) | Untung/Rugi`,
a currency row (`US Dollar`), one row per revalued account and month (alphabetical by account name), and a total row
`foreign | domestic | revalued | gain`.

## Calculation rules

- Rows exist only for months closed with **Proses Akhir Bulan** with gain/loss on. The month-end document carries the
  rate per currency (`currencyRate[n].currencyId/rate`). Before T36's period end the report printed the header only.
- Per foreign account: Nilai Asing = open foreign balance; Nilai Domestik (Bulan) = its IDR book value (invoice rate);
  Kurs Akhir Bulan = the month-end rate; Nilai Domestik (Akhir Bulan) = foreign x month-end rate;
  Untung/Rugi = revalued - book.
- T36: 200 USD invoiced at 15.000 (3.000.000), month-end rate 15.400, giving 3.080.000 and a gain of 80.000.
- The period-end journal (`Proses Akhir Bulan`, number `Januari 2037`) reverses the book value and posts the revalued value
  per account (Cr 110303 3.000.000 / Dr 110303 3.080.000 / Cr 720202 Laba/Rugi Belum Terealisasi USD 80.000).
  Losses on the demo banks debit 720202.

## Seeding notes

`save-period-end.do` with flat `param.*`: `yearPE`, `monthPE` (1-based), `gainLoss: true`, `depreciation: false`,
`currencyRate[0..n]` (IDR 1, USD rate).

## Open work

- The ERP computes the report but does not post the revaluation journal or carry the revalued book value into the next
  month (`shortcut:` in the code). Foreign bank accounts are not modelled (ADR-0012).
