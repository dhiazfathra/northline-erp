# ADR-0004: Chart of accounts through an event-sourced Account aggregate

## Status
Accepted — refines ADR-0001's scope ("Journal and Period first; master data as plain tables").

## Date
2026-10-18

## Context
Every report reads accounts (type decides sign, section and fiscal-year reset; parent decides ordering and roll-ups).
Posting must refuse suspended accounts at decision time, which a plain table read inside the command can do but not
prove in history. Customers, vendors and items remain CRUD-shaped and stay plain.

## Decision
- `account-<no>` streams with `AccountOpened`, `AccountRenamed`, `AccountSuspended`; commands `OpenAccount`,
  `RenameAccount`, `SuspendAccount` go through the same idempotent handler as journals.
- The `accounts` table becomes the Account read model, written by the `ledger` projection with idempotent upserts. Its
  audit trigger stays, so `accounts_audit` keeps a row history for auditors who query SQL.
- `PostJournal` rejects lines to a suspended account (checked on the aggregate).
- Accounts imported directly into `accounts` (migration of a legacy CoA) remain valid for posting; they get a stream
  the first time they are renamed or suspended through a command.

## Alternatives Considered
- **Keep the plain table only**: simpler; rejected because suspension and type changes need to be decidable and replayable.
- **Allow type changes**: rejected for now. Accurate locks the type once an account has transactions, and a type change
  re-signs history in every report.

## Consequences
- Vendors, customers and items stay plain tables with audit triggers until a report needs their history.
- Re-parenting is not supported yet.
