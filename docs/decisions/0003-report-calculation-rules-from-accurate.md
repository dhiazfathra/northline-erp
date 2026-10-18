# ADR-0003: Report calculations follow Accurate's observed rules

## Status
Accepted

## Date
2026-10-18

## Context
Accurate's *Daftar Laporan* is the acceptance spec (catalog: `docs/reports/README.md`). Several of its rules differ from
textbook defaults, and each one changes numbers on the page. We reverse-engineered them by seeding isolated journals
(`NL-T1-*` accounts, dated 2030–2031) in the sandbox Data Usaha and reading back the reports.

## Decision
The ERP reproduces Accurate's observed behaviour, not our own preference. Rules found so far (detail and fixtures in
`docs/reports/TrialBalanceReport.md`):

1. **Net balances print on one side** by sign (debit if net > 0), regardless of the account's normal side.
2. **Period movement is gross**: debit and credit sums are not netted against each other.
3. **P&L accounts reset at fiscal-year start**; balance-sheet accounts carry forward.
4. **Closed years roll into the retained-earnings account** (a company preference) at report time. No closing journal is
   posted, and there is no "current-year earnings" row in the trial balance.
5. **Zero rows** hide only when opening, debit and credit are all zero.
6. **Ordering** is account-tree depth-first, siblings by account number as a string; not grouped by account type.
7. **Amounts** are stored as integer cents (2 decimals); display is `id-ID` with trailing decimal zeros trimmed.

Rule 4 means year-end close is a *read-side* rule: the ledger stays a list of journals, and every balance query
computes the roll-forward. This keeps the event stream free of synthetic closing entries and lets a past year be
reopened without unposting anything.

## Alternatives Considered

### Post explicit year-end closing journals
- Pros: balances are a plain sum; textbook.
- Cons: Accurate does not do it, so reports would diverge in the year after close; reopening a year means reversing the close.
- Rejected.

### Show signed balances in a single column
- Rejected: diverges from the acceptance spec's layout.

## Consequences
- `trialBalance()` (`apps/api/src/reports/trial-balance.ts`) is a pure function over `account_daily_balances`; the P&L,
  balance sheet and ledger reports reuse its opening/roll-forward logic.
- Every new report gets a sandbox fixture and a zero-diff regression test before it is called done.
- Fiscal-year start other than January and multi-currency balances are still unverified.
