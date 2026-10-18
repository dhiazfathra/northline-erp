# Rincian Pencatatan Beban (`ExpenseAccrualDetailReport`)

Group: Buku Besar. **Status: verified** (zero diff, two seeded accruals). Fixture: [`fixtures/expense-accrual-t26.json`](fixtures/expense-accrual-t26.json).
ERP: `apps/api/src/reports/expense-accrual.ts` (`expenseAccrualDetail`), service `createExpenseAccrual` in `apps/api/src/cash-bank/service.ts`
(migration 0032); test: `apps/api/test/purchases-2036.test.ts`.

## Parameters

`startDate` / `endDate` (dd/MM/yyyy) + `selectedBranch` (`[{"name":"[Semua Cabang]","id":null}]`).

## Layout

One page per accrual, **oldest first**: `No Beban # : <no> | Dibayar : <paid>`, `Tanggal : <date> | Status : <status>`,
`Jatuh Tempo : <due>`, then `Kode Perkiraan | Nama Biaya | Jumlah` (Nama Biaya = account name), lines in entry order, and
a one-cell total row.

## Calculation rules

- Same accruals and window as the [summary](ExpenseAccrualSummaryReport.md).

## Source document

Pencatatan Beban (`/accurate/general-ledger/save-expense-accrual.do`, flat `param.*`; number `EXP.yyyy.mm.nnnnn`): header
date, due date, payable account (`expensePayableId`), `detailAccount[n]` lines (`accountId`, `amount`). Journal: Dr each
expense line in entry order / Cr the payable account for the total; GL type `Pencatatan Beban`.

## Open work

- Paying an accrual (Dibayar, status change) is not captured (`shortcut:` in the code).
