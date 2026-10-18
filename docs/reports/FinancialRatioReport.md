# Rasio Keuangan (Per Tahun) (`FinancialRatioReport`)

Group: Keuangan. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/financial-ratios.json`](fixtures/financial-ratios.json). ERP: `apps/api/src/reports/financial-ratios.ts`; test: `apps/api/test/financial-ratios.test.ts`.

Params: `asOfYear`. Header "per 2031"; previous column `Tahun Sebelumnya`. Each column covers the full calendar year and its closing balances (31 Dec), also for a year not yet over.

Ratios use whole-company balances, so the fixture's inputs are the totals Accurate prints on Neraca (Standar) and Laba/Rugi (Standar)
for the same dates, and the test checks every printed value (23 ratios × 2 columns) from them. Our statements are verified separately.

Columns: `Jenis Rasio` | `Rasio` | previous-period column | `Satuan`. Revenue = Jumlah Pendapatan; "avg" = (start + end) / 2 where start is
the balance at the end of the period before. Division by zero prints `0`. Values rounded half-up, id-ID decimal comma, trailing zeros trimmed.

| Ratio | Formula | Decimals | Unit |
|---|---|---|---|
| Current Ratio | current assets / current liabilities | 2 | Kali |
| Quick Ratio | (cash + receivables) / current liabilities | 2 | Kali |
| Cash Ratio | cash / current liabilities × 100 | 2 | % |
| Cash Turnover | revenue / avg cash × 100 | 2 | % |
| Inventory to Net Working Capital | inventory / (current assets − current liabilities) × 100 | 2 | % |
| Debt to Asset Ratio | liabilities / assets × 100 | **1** | % |
| Debt to Equity Ratio | liabilities / equity × 100 | **1** | % |
| Long Term Liability to Equity Ratio | long-term liabilities / equity | 2 | Kali |
| Equity Multiplier | assets / equity | 2 | Kali |
| Total Asset / Receivable / Fixed Asset Turnover | revenue / avg of that balance | 2 | Kali |
| Payable / Inventory Turnover | COGS / avg payables / inventory | 2 | Kali |
| Average Collection Period, Days of Receivable | 365 / receivable turnover (365 also in the monthly report) | 2 | Hari |
| Days of Inventory | 365 / inventory turnover | 2 | Hari |
| Working Capital Turnover | revenue / avg (cash + receivables + inventory − current liabilities) | 2 | Kali |
| Gross / Operating / Net Profit Margin | (revenue − COGS) / operating income / net income ÷ revenue × 100 | 2 | % |
| Return On Asset / Equity | net income / closing assets / equity × 100 | **1** | % |

Ambiguous in the fixture (both readings give the printed value): asset turnover and ROA/ROE with average vs closing balances,
payable turnover's numerator (COGS vs purchases).
