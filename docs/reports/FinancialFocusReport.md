# Fokus Keuangan (`FinancialFocusReport`)

Group: Keuangan. Observed in Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: `fixtures/financial-ratios.json`
(`FinancialFocusReport`). **Status: verified** under [ADR-0013](../decisions/0013-demo-inclusive-totals.md): zero diff on every cell of 2031 vs 2030 except the Modal Kerja `Penambahan (%)`, which is flagged below.
ERP: `apps/api/src/reports/financial-ratios.ts` (`financialFocus`), from the same statement totals as Rasio Keuangan; test: `apps/api/test/financial-ratios.test.ts`.

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

`Penambahan (%)` = (this − last) / last × 100 with a **signed** denominator (2032 Pendapatan Operasi: 750.000 vs −250.000,5 prints −400), 2 decimals, on unrounded values; 0 when last is 0. The exception is the Modal Kerja row. Six years captured 2026-10-18 (`byYear` in the fixture) still do not isolate the Modal Kerja base:

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
row's percentage is the plain change. The user accepted verifying the other cells and flagging this one (2026-10-18). The ERP prints the plain change in that cell
(`shortcut:` in the code).

## Trade Portal Demo variation (2026-10-19)

Source: Trade Portal Demo (PT Automotive Shop). As Rasio Keuangan (Per Tahun): yearly 2045 figures include the March HPP; blocked on average costing for Trade Portal, rules verified on Manufaktur Demo. See ADR-0029.

Re-verified 2045 on Trade Portal Demo after average costing (ADR-0031), capture `FinancialFocusReport:2045` in
[fixtures/trade/trade-tp.json](fixtures/trade/trade-tp.json), test `apps/api/test/trade-portal-trade.test.ts`. Rules learned:
Total Pendapatan includes Pendapatan Non Operasional (13.400.000 + 1.250.000 = 14.650.000); Penambahan (%) is 100 when last
year is 0 and this year is not; Rasio Lancar prints 100 when there are no current liabilities (2044), so its change is
(2.199,42 - 100) / 100 = 2.099,42; thousands separators. Modal Kerja % still unexplained (0,25 vs plain change 0,15; ADR-0013).
The 0,01 ledger-precision gap of ADR-0031 shows on Pendapatan Operasi, Laba/Rugi, Modal Kerja and Modal.
