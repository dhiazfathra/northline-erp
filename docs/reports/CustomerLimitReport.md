# Limit Piutang Pelanggan (`CustomerLimitReport`)

Group: Piutang. **Status: verified** (zero diff). Fixture: [`fixtures/tax-t19.json`](fixtures/tax-t19.json) (`reports.CustomerLimitReport`).
ERP: `apps/api/src/reports/receivables.ts` (`customerLimit`), loader `loadCreditLimits`; test: `apps/api/test/tax.test.ts`.

## Parameters

No date (`NONE`): `{"selectedBranch":[{"name":"[Semua Cabang]","id":null}]}`. Balances are current, over all dates.

## Layout

```
Limit Piutang Pelanggan
Cabang : [Semua Cabang], Filter berdasarkan : Limit Piutang
Nama | Saldo (Mata Uang) | Pesanan | Giro Mundur | Limit Piutang | Sisa Limit
Umum                                         <- customer category
NL-T19 Pelanggan PKP | IDR 444.000, USD 0 | 0 | 0 | 1.000.000 | 556.000
```

## Calculation rules

- Only customers with an amount limit (customer form: `customerLimitAmount` + `customerLimitAmountValue`). With no
  limits set the report is empty (default capture).
- Saldo = the customer's receivable (invoices incl. PPN − receipts − returns), listed for every currency in the sandbox.
- Sisa Limit = Limit − Saldo (− Pesanan − Giro Mundur, both 0 here; `shortcut:` in the code).
