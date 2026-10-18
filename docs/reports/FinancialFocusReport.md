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

`Penambahan (%)` = (this − last) / |last| × 100, 2 decimals, except the Modal Kerja row. Next step: seed a year where
working capital changes in a known way and isolate the Modal Kerja percentage base.
