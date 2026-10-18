# Grafik Perbandingan Nilai Akun (`AccountValueCompareChartReport`)

Group: Keuangan. **Status: verified via backing table** (ADR-0011). Fixture: [`fixtures/financial-statements.json`](fixtures/financial-statements.json)
(`AccountValueCompareChartReport`), images `captures/charts/AccountValueCompareChartReport-t1-*.png`.
ERP: `apps/api/src/reports/financial-statements.ts` (`accountValueCompareChart`); test: `apps/api/test/statements.test.ts`.
Backing figures: the NL-T1 profit-and-loss movements verified by the Laba/Rugi reports (trial-balance.json journals).

## Parameters

`FROMTO`: `{"startDate":"dd/MM/yyyy","endDate":"dd/MM/yyyy"}`; no account selection was given (default). PNG via
`runReport(app, id, param, { view: 'xls' })`.

## Layout and rules

Unlabeled line chart, x = month ("Des 2030", "Jan 2031", ...; Indonesian abbreviations), y = Nilai. Points only for
months with profit-and-loss activity; value = sum over revenue and expense accounts of |net movement in the month|:

| Month | P&L movements | Point |
|---|---|---|
| Des 2030 | revenue 3.000.000 | 3.000.000 |
| Jan 2031 | expense 1.250.000,5 | 1.250.000 (gridline) |
| Feb 2031 | revenue 2.000.000 + expense 1.000.000 | 3.000.000 |
| Mar 2032 | revenue 750.000 | 750.000 |

Months without P&L activity (Mar 2031 - Feb 2032) have no point, even with balance-sheet postings (Mar 2032 equity
movements do not count).

## Open work

- Account selection (if the report accepts one through its selection list) is not captured (`shortcut:` in the code).
