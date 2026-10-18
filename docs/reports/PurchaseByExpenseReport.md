# Pembelian per Biaya (`PurchaseByExpenseReport`)

Group: Pembelian. **Status: verified** (zero diff, 2 windows over two seeded invoices). Fixture: [`fixtures/purchase-expense-t25.json`](fixtures/purchase-expense-t25.json).
ERP: `apps/api/src/reports/payables.ts` (`purchaseByExpense`), loader `loadPurchaseExpenses`; expense lines in `createPurchaseInvoice`
(`expenses`, table `purchase_invoice_expenses`, migration 0031); test: `apps/api/test/purchases-t24-t25.test.ts`.

## Parameters

`startDate` / `endDate` (dd/MM/yyyy) + `selectedBranch` (`[{"name":"[Semua Cabang]","id":null}]`). View `crosstab`.

## Layout

`Nama Akun | Jumlah`, one row per expense account, then `Total Nama Akun`. With no expense lines in the window only the
title, date and branch lines print.

## Calculation rules

- Source: the **Biaya** tab of Faktur Pembelian (`detailExpense`: account, amount, name). Item lines never count, even for
  the same invoice.
- Expense lines dated (invoice date) in the window are summed per account; rows are ordered by account number (600011
  before 600013; alphabetical order gives the same result here, not disambiguated).
- Journal: each expense line debits its account after the item debits, in entry order; Hutang Usaha is credited for
  items + expenses.

| Window | Beban Listrik | Beban Telekomunikasi | Total |
|---|---|---|---|
| 1 - 31 Mei 2036 (P1 only) | 250.000 | - | 250.000 |
| 1 - 31 Mei 2036 | 300.000 | 75.000 | 375.000 |
| 10 - 31 Mei 2036 | 50.000 | 75.000 | 125.000 |

## Open work

- Expenses with `allocateToItemCost`, taxed expenses and branch filtering are not captured.
