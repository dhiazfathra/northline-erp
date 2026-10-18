# Laba Ditahan (`RetainedEarningReport`)

Group: Keuangan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture:
[`fixtures/equity.json`](fixtures/equity.json) (journals J1–J9 of `trial-balance.json`). ERP: `apps/api/src/reports/equity.ts`.

Params: `asOfYear` (number). Header "per 2031". Columns `Keterangan` | `Nilai`. All values C − D (credit positive).

| Row | Value |
|---|---|
| Laba ditahan tahun Y−1 | retained-earnings account postings before 1 Jan Y **plus** all P&L before 1 Jan Y (closed years rolled in) |
| Laba Bersih Tahun ini, then Januari … Desember | net income per calendar month of Y; months with nothing print `0` |
| Total Laba Bersih Tahun ini | sum of the months |
| Perubahan Saldo Transaksi pada Akun Laba Ditahan Tahun Y | direct postings to the retained-earnings account in Y |
| Peningkatan/Penurunan Laba Ditahan Tahun Y | total net income + direct postings |
| Laba ditahan tahun Y | opening + increase |

Fixture: 2031 opens at `-31.002.596` (sandbox history `-34.002.596` + 2030 income `3.000.000`), Jan `-1.250.000,5`, Feb
`1.000.000`, closes `-31.252.596,5`; 2032 opens at that close. The sandbox's unrelated balance is subtracted in the test.

Unverified: fiscal year not starting in January (months assumed to follow the calendar year).
