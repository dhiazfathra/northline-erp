# Ringkasan Pencatatan Beban (`ExpenseAccrualSummaryReport`)

Group: Buku Besar. **Status: verified** (zero diff, two seeded accruals). Fixture: [`fixtures/expense-accrual-t26.json`](fixtures/expense-accrual-t26.json).
ERP: `apps/api/src/reports/expense-accrual.ts` (`expenseAccrualSummary`), service `createExpenseAccrual` in `apps/api/src/cash-bank/service.ts`
(migration 0032); test: `apps/api/test/purchases-2036.test.ts`.

## Parameters

`startDate` / `endDate` (dd/MM/yyyy) + `selectedBranch` (`[{"name":"[Semua Cabang]","id":null}]`).

## Layout

`No Beban # | Tanggal | Jatuh Tempo | Total | Dibayar | Status`, one row per accrual dated in the window, **newest first**.

## Calculation rules

- Total = sum of the accrual's expense lines. Unpaid accruals print Dibayar `0` and Status `Sedang diproses`.
- Window filters on the accrual date (10 Jun - 31 Jul 2036 drops EXP...00001 dated 1 Jun), not the due date.

## Source document

Pencatatan Beban (`/accurate/general-ledger/save-expense-accrual.do`, flat `param.*`; number `EXP.yyyy.mm.nnnnn`): header
date, due date, payable account (`expensePayableId`), `detailAccount[n]` lines (`accountId`, `amount`). Journal: Dr each
expense line in entry order / Cr the payable account for the total; GL type `Pencatatan Beban`.

## Open work

- Paying an accrual (Dibayar, status change) is not captured (`shortcut:` in the code).
