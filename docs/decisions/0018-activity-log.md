# ADR-0018: Log Aktifitas (activity log) is in scope, written with every change

## Status
Accepted (supersedes [ADR-0010](0010-report-scope.md) for `AuditListReport` only; the user/access reports
`UserByBranchListReport`, `AccessGroupPrivilegeListReport`, `AccessPrivilegeByUserListReport` stay out of scope)

## Date
2026-10-18

## Context
ADR-0010 put Daftar Log Aktifitas out of scope as "Accurate's own users, not accounting data". An ERP still needs to
answer "who changed this document, when, from where", and Accurate's report is a precise spec of that answer.
Reverse-engineering the sandbox (rules in [`docs/reports/AuditListReport.md`](../reports/AuditListReport.md)) showed:
- one row per **successful** save (create, edit, delete); rejected saves leave no row;
- the reference (number, or name for master data) and the transaction date are **snapshots** at save time: renumbering a
  journal shows the new number on the edit row while earlier rows keep the old one;
- the date filter and the Tanggal column use the **log** day in Asia/Jakarta; rows sort by the hidden log time, newest first;
- some saves write more than one row (a customer edit logs Pelanggan and Kontak; an asset edit logs Aset Tetap too).

The ERP has two write paths: event-sourced aggregates (Journal, Account, Period; ADR-0001/0004) and plain tables with
`audit_log` row history (ADR-0005). `audit_log` records rows, not user actions, and has no actor.

## Decision
- New append-only table `activity_log` (migration 0040): `logged_at` (clock time, ms precision), `user_id`, `client_ip`,
  `action` (CREATE/UPDATE/DELETE), `entity` (Accurate's transaction-type code: `JV`, `SI`, `ACC`, `CST`, ...),
  `reference`, `doc_date`. Triggers block UPDATE, DELETE and TRUNCATE, as on `events`.
- Rows are written **in the same transaction** as the change, so a row exists exactly when the change commits.
  - Event-sourced commands log from their command metadata (`userId`, `ip` set by `/api/ledger/commands`); only
    journals whose source is `JV` log as Jurnal Umum, since document journals are logged by their document.
  - Plain-table services call `logActivity(tx, ...)`; the actor comes from an `AsyncLocalStorage` scope that the API
    opens per request after `requireSession`. Service signatures stay unchanged.
- The actor is the session user (httpOnly cookie). The IP is the socket address under Bun and `cf-connecting-ip` on
  Workers (ADR-0017); a client-sent header is never trusted under Bun.
- `audit_log` stays as row history; the activity log is the user-facing view.
- Journals gain `EditJournal` / `DeleteJournal` (events `JournalEdited`, `JournalDeleted`) and accounts `DeleteAccount`
  (`AccountDeleted`, refused while anything references the account). Events stay append-only; the projection takes
  the old lines back out of the balances. Sales invoices gain edit (taken back and re-saved in one transaction,
  keeping the document number) and delete (refused once a receipt, return, exchange invoice or SPT uses it).
- `auditList(rows, from, to)` renders the report; `GET /api/reports/activity-log?from&to` serves it.

## Alternatives Considered

### Database triggers on every table, actor passed through `set_config`
- Pros: no service code changes; impossible to forget a table.
- Cons: a trigger sees rows, not actions: one invoice save touches five tables, an edit is delete+insert, and
  Accurate's snapshots (name for masters, number for documents) need per-type knowledge anyway. Event-sourced writes
  would still need separate handling.
- Rejected: the log would mirror storage, not what the user did.

### Derive the report from `audit_log` + `events` at read time
- Pros: no new table.
- Cons: no actor or IP on `audit_log`; snapshots would have to be reconstructed; deleting history rows would erase
  the trail.
- Rejected.

### Journal edit as reversal + new journal
- Pros: no new events.
- Cons: Accurate keeps one document; a reversal shows up in journal reports Accurate does not have.
- Rejected.

## Consequences
- Every new create/edit/delete path must call `logActivity` (or run through the ledger handler with metadata); a
  service that forgets produces no row, and the zero-diff test catches only the types it seeds.
- Entity types logged so far: Jurnal Umum, Faktur Penjualan, Akun Perkiraan, Pelanggan (+ Kontak), Barang & Jasa.
  Other documents and master data log nothing yet (see the report doc's open work).
- Users gain an optional `name` (the Pengguna column falls back to the email).
