# Fokus Keuangan (`FinancialFocusReport`) — partial, not verified

Group: Keuangan. Observed in Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: `fixtures/financial-ratios.json`
(`FinancialFocusReport`). Not implemented in the ERP yet.

Params: `asOfYear`. Columns: `Keterangan` | `Tahun ini` | `Tahun Lalu` | `Penambahan (%)`.

| Row | Rule (fixture 2031 vs 2030) | Status |
|---|---|---|
| Total Pendapatan | Jumlah Pendapatan of the year (2.000.000 / 3.000.000, −33,33) | reconciles |
| Pendapatan Operasi | PENDAPATAN OPERASIONAL (−250.000,5 / 3.000.000, −108,33) | reconciles |
| Laba/Rugi | LABA BERSIH | reconciles |
| Modal Kerja | cash + receivables + inventory − current liabilities at 31 Dec (122.437.403,5 / 137.687.404) | values reconcile; **% printed −3,87 does not** (plain change is −11,08) |
| Rasio Lancar | (cash + receivables + inventory) / current liabilities, 2 decimals (2,19 / 2,35, −6,85 on unrounded values) | reconciles |
| Liabilitas Jangka Panjang | Jumlah Kewajiban Jangka Panjang | reconciles (0) |
| Modal | Jumlah Ekuitas (137.657.403,5 / 137.907.404, −0,18) | reconciles |

`Penambahan (%)` = (this − last) / |last| × 100, 2 decimals, except the Modal Kerja row. Six years captured 2026-10-18 (`byYear` in the fixture) still do not isolate the Modal Kerja base:

| Year | Modal Kerja | Last year | Printed % | Plain change % | Implied base (Δ / printed %) |
|---|---|---|---|---|---|
| 2031 | 122.637.403,5 | 137.887.404 | -3,86 | -11.06 | 395.1 jt |
| 2032 | 126.887.403,5 | 122.637.403,5 | 1,29 | 3.47 | 329.5 jt |
| 2033 | 129.218.203,5 | 126.887.403,5 | 1,17 | 1.84 | 199.2 jt |
| 2034 | 140.673.003,5 | 129.218.203,5 | 3,73 | 8.86 | 307.1 jt |
| 2035 | 142.498.253,5 | 140.673.003,5 | 1,03 | 1.30 | 177.2 jt |
| 2036 | 142.498.253,5 | 142.498.253,5 | 0 | 0.00 | - |

The implied base swings between about 177 and 395 jt and matches none of: last year's working capital, current assets,
current liabilities, their sum, total assets estimated from the ratio, or working capital less a constant. Every other
row's percentage is the plain change. Status stays **spec**: implementing the other six rows without this one would not
be a zero-diff report.
