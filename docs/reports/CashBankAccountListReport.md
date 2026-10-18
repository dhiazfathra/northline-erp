# Daftar Kas (`CashBankAccountListReport`)

Group: Kas & Bank. Reverse-engineered from Accurate Online v1.0.1#4970 (sandbox), 2026-10-18. Fixture: [`fixtures/cash-bank.json`](fixtures/cash-bank.json). ERP: `apps/api/src/reports/cash-bank.ts`; test: `apps/api/test/cash-bank.test.ts`.

Params: `asOfDate`. Columns: `Kode Perkiraan` | `Nama` | `Saldo (per Mata Uang)` | `Saldo (IDR)`.

1. One block per currency, headed by the currency name ("Indonesian Rupiah", "US Dollar").
2. Every CASH_BANK account of that currency, zero balances included, account-tree order, parents with subtree sums.
3. Block total row = sum over **leaf** accounts (sandbox: −657.614,5 excludes parent 1101).
4. Foreign-currency accounts show the currency amount and a revalued IDR amount (sandbox: USD 100 → 1.600.000). The ERP is single-currency for now and prints the IDR block only.
