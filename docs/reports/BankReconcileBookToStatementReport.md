# Rekonsiliasi Bank (Jurnal terhadap Rekening Koran) (`BankReconcileBookToStatementReport`)

Group: Kas & Bank. **Status: verified** (zero diff). Fixture: [`fixtures/tax-t19.json`](fixtures/tax-t19.json) (`bankReconciliations`, `reports.BankReconcileBookToStatementReport`).
ERP: `apps/api/src/reports/cash-bank.ts` (`reconcileBookToStatement`), command `apps/api/src/cash-bank/reconcile.ts`; test: `apps/api/test/tax.test.ts`.

## Layout

`Tgl Transaksi | Tipe Transaksi | No. Transaksi | Tipe Mutasi | Nilai | Keterangan Transaksi | Tanggal Rekening Koran | Mutasi | Keterangan | Direkonsiliasi Oleh`, one heading row per bank account.

## Calculation rules

Source: manual bank reconciliation (Daftar > Rekonsiliasi Bank, module `accurate__cash-bank__bank-reconcile`): a book
entry of the bank account is matched to a rekening-koran line. Without an imported statement Accurate creates the
statement line from the book entry (`add-exist-in-bankstatement.do`) and saves the match (`save-bank-reconcile.do`,
BOOK_TO_STATEMENT); `tools/accurate/reconcile.mjs`. Fixture: R1 (NL-T1-1101.2035.11.00002, 1.200.000 booked 28 Nov 2035)
reconciled on statement date 30 Nov 2035, description "NL-T19 RK1".

- Parameters: `FROMTO` + `selectedBank` **array of `{id}`** (`[]` returns nothing).
- Rows: reconciled book entries whose transaction date is in range, grouped by bank account name.
- Tipe Mutasi Dr = money in. Nilai and Mutasi are equal for a manual match.
- **Direkonsiliasi Oleh prints the login user.** The capture stores it as `[REDACTED]` (the runner scrubs secrets from
  every row); the ERP stores the reconciling user's name.

## Open work

- Imported statements, statement lines without a book entry, and STATEMENT_TO_BOOK matching are not modelled.
