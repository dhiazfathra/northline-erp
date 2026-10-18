# Migration plan and spec: `apps/api` from Hono/Bun to Go

Status: Draft · Date: 2026-10-18 · Scope: `apps/api` only (the web app changes only its API client)

## 1. Goal and non-goals

**Goal.** Replace the Hono-on-Bun ledger service with a Go service that has full feature parity. Data integrity
is the main constraint: the Go service must read and write the **same PostgreSQL database, same schema, same
event shapes**, so either implementation can run on data written by the other. That two-way compatibility is
what makes rollback possible.

**Non-goals during the port.**
- No schema changes, no new endpoints, no new reports, no behaviour "fixes" mixed into the port. Every intentional
  deviation is listed in §9 and lands as its own change, either before the port (in TypeScript) or after cutover
  (in Go).
- No change to the accounting rules (ADR-0003) or the event-sourcing design (ADR-0001, ADR-0002, ADR-0004).

## 2. Current architecture (as inspected)

About 1,700 lines of TypeScript in `apps/api/src`. One binary (`bun build --compile`) with three roles.

| Layer | Files | What it does |
|---|---|---|
| Entry / CLI | `src/main.ts` | `--role=web\|worker\|all` (default `all`), `create-user <email>` (password from `NL_PASSWORD`), `rebuild <projection>`. Runs `migrate()` on every start. SIGTERM/SIGINT: stop the server, let the worker loop finish its iteration, stop pg-boss gracefully, close the DB (5 s timeout). |
| DB | `src/db.ts`, `migrations/*.sql` | `postgres` (porsager) client, pool max 10, notices suppressed, Drizzle used only as `db.execute(sql\`…\`)`. Hand-written migrations embedded in the binary, tracked in `_migrations(name)`, each applied in its own transaction in name order. |
| Event store | `src/es/store.ts` | `append` with expected version (unique `(stream_id, stream_version)` → `ConcurrencyError`), outbox row per event in the same transaction, upcaster registry (empty today, so `event_version` = 1), snapshots every 50 versions, `load` = snapshot + newer events. |
| Outbox relay | `src/es/relay.ts` | Batches of 100 pending outbox rows (`FOR UPDATE SKIP LOCKED`) sent to pg-boss queue `ledger.<EventType>` with `singletonKey = outbox.id`, then `relayed_at = now()`. At-least-once. **No consumer exists in the repo.** |
| Domain | `src/ledger/deciders.ts`, `src/ledger/handler.ts` | Pure `decide`/`evolve` for Journal, Period and Account aggregates. `handle()`: Zod parse, advisory lock on the idempotency key, replay check in `command_results`, decide, append, store result, all in one transaction. |
| Projections | `src/projections/index.ts` | One projection, `ledger`: `accounts` (idempotent upserts), `journals`, `journal_lines`, `account_daily_balances`, `period_summaries`. Checkpoint advanced in the same transaction as the read-model writes, batch 500. `rebuild` truncates the projection's tables (not `accounts`) and replays from 0. `waitFor(position)` polls `MIN(checkpoint)` every 50 ms, 5 s timeout. |
| Reports | `src/reports/*.ts` | Pure functions over `accounts`, `account_daily_balances`, `journals`/`journal_lines` and `ledger_settings`; `queries.ts` loads data, the rest computes. Covered by Accurate fixtures in `docs/reports/fixtures/*.json`. |
| HTTP | `src/app.ts`, `src/auth.ts`, `src/spa.ts` | Hono app under `/api`, session cookie auth, embedded SPA fallback for everything else. |
| Shared contracts | `packages/schemas/src/ledger-es.ts`, `auth.ts` | Zod schemas for commands, events, report queries. Also used by the web app for form validation. |
| Web client | `apps/web/src/api/client.ts` | `hc<AppType>` from `hono/client`, typed from `apps/api/types/app.d.ts`. Two live call sites: `api.auth.login.$post` and `api.reports['trial-balance'].$get`. Everything else is still mock data. |

Database guarantees that live in SQL and carry over unchanged: `events` append-only triggers (UPDATE, DELETE,
TRUNCATE), deferred `journal_lines_balanced` constraint trigger, `journal_lines` CHECKs (non-negative, exactly one
side), FKs to `accounts`, `accounts_audit` trigger, `ledger_settings` singleton CHECK.

## 3. Target architecture

Smallest Go stack that covers the current surface. Standard library first, one driver, one crypto package.

| Concern | Choice | Why |
|---|---|---|
| Go | 1.27 (installed) | |
| HTTP | `net/http` `ServeMux` with method and path patterns | Twelve routes; no framework needed. Path enums (`{report}`) validated by hand. |
| Postgres | `github.com/jackc/pgx/v5` + `pgxpool` (max 10 conns) | Same role as `postgres`. Raw SQL, copied from the TS code. No ORM, no sqlc for now. |
| Password hashing | `golang.org/x/crypto/argon2` + PHC string encode/parse | Must verify existing `Bun.password` argon2id hashes (`m=65536,t=2,p=1`). |
| Validation | Hand-written, per command | Small surface; error strings must match the Zod messages exactly (§6.4). |
| Outbox relay | See decision D2 (§10) | pg-boss has no Go client. |
| Embedding | `embed` for migrations and the SPA `dist` | Same single-binary deployment. |

Layout (temporary name `apps/api-go`, renamed to `apps/api` after the TypeScript service is deleted):

```
apps/api-go/
  cmd/northline-api/main.go     roles, create-user, rebuild, signal handling
  migrations/                   moved here from apps/api/migrations (single copy, see P1)
  internal/db/                  pool, migrate (go:embed migrations/*.sql)
  internal/es/                  store (append, readStream, readAll, load, snapshot), relay
  internal/ledger/              commands (parse + validate), deciders, handler
  internal/projections/         ledger projection, catchUp, rebuild, waitFor
  internal/reports/             one file per TS report file, same function names
  internal/httpapi/             routes, auth, error mapping, SPA
  internal/spa/dist/            copied from apps/web/dist at build time (gitignored)
  parity/                       differential test harness (§8.2)
```

Package boundaries mirror the TypeScript folders one to one, so each port step is a file-for-file review.

## 4. Data contract (must be byte-compatible)

Both implementations read and write these tables. Anything Go writes must be readable by the TypeScript code and
the other way round.

### 4.1 Event envelope (`events` row)

| Column | Value |
|---|---|
| `stream_id` | `journal-<uuid>`, `period-<YYYY-MM>`, `account-<no>` |
| `stream_version` | expected version + 1, +1 per event in the batch |
| `event_type` | `AccountOpened`, `AccountRenamed`, `AccountSuspended`, `JournalPosted`, `JournalReversed`, `PeriodClosed`, `PeriodReopened` |
| `event_version` | `CURRENT_VERSION[type] ?? 1` (always 1 today) |
| `payload` | jsonb, shapes below |
| `metadata` | jsonb `{ requestId?, userId?, commandType, idempotencyKey }` |
| `global_position`, `created_at` | set by the database; Go never sets them |

### 4.2 Payload shapes

Key names are camelCase. **Optional fields are omitted when absent, never `null`, and an empty string is kept.**
In Go that means optional strings are `*string` with `omitempty`. A plain `string` with `omitempty` would drop
`""`, which JavaScript keeps; that would be a silent divergence.

```
AccountOpened    { no, name, accountType, parentNo? }
AccountRenamed   { no, name }
AccountSuspended { no }
JournalPosted    { journalId, number?, date, description, lines: [{ account, side, amount, memo? }], reverses? }
JournalReversed  { journalId, reversalJournalId, date, reason }
PeriodClosed     { period }
PeriodReopened   { period }
```

- `amount` is a positive integer in cents. `side` is `DEBIT` or `CREDIT`. Line order is preserved as submitted.
- `description` and `reason` are always present (default `""`).
- `number` is always set by the handler today (given, or auto-generated), but stays optional in the shape.
- jsonb normalises key order and whitespace, so struct field order does not matter. Missing-vs-null and
  integer-vs-float do matter.

### 4.3 Outbox row

`topic = 'ledger.' + event_type`. `payload` = the stored event without `createdAt`:
`{ globalPosition, streamId, streamVersion, type, version, data, metadata }`. Written in the same transaction as the
event, one row per event, in the same order.

### 4.4 Other write-side tables

| Table | Contract |
|---|---|
| `command_results` | `(idempotency_key, command_type, result)` with `result = { globalPosition, streams }`. `streams` order: Reverse is `[original stream, reversal stream]`; the others are `[stream]`. |
| `snapshots` | Written only for period streams when the new version is a multiple of 50. State JSON is `{ "closed": bool }`. `load` reads snapshots for every stream type, so if Go ever snapshots journals or accounts, the state JSON must match the TS `evolve` output exactly (`{status, journalId, date, lines}` / `{status, no, name}`). |
| `number_sequences` | Prefix `JV.<yyyy>.<mm>.`, upsert `last + 1 RETURNING last`, zero-padded to 5 digits (wider numbers are not truncated). Runs inside the command transaction, so a rejected command does not burn a number. |
| `users`, `sessions` | §6.5. |
| `_migrations` | Same file names. Go must see `0001_ledger.sql`, `0002_number_sequences.sql`, `0003_auth.sql` as applied and never re-run them. |

### 4.5 Read models

Written only by the `ledger` projection, exactly as `src/projections/index.ts` does today: the same SQL, the same
`ON CONFLICT` clauses, `line_no` 1-based in submitted order, `period_summaries.debit = credit = journal total`,
`journals += 1`, `reversed_by` set on `JournalReversed`, `closed` upserted on period events. The checkpoint name stays
`ledger`.

## 5. Behaviour spec: write side

Port these functions line for line. The order of checks decides which error a caller sees, so it is part of the
contract.

### 5.1 `handle(command, metadata)`

1. Parse and validate (§6.4). Validation failure → 422, before any transaction.
2. Begin a transaction. `SELECT pg_advisory_xact_lock(hashtext($idempotencyKey))`.
3. If `command_results` has the key, return the stored `result` unchanged. The payload is **not** compared with the
   original (parity; see §9 R3).
4. `meta = { ...metadata, commandType, idempotencyKey }`. `requestId` comes from the `x-request-id` header and is
   omitted when the header is absent. `userId` is the session user id (a number).
5. Dispatch:
   - **PostJournal**: unknown accounts (all distinct line accounts missing from `accounts`) → `Akun tidak dikenal: a, b`.
     Then, for each distinct account in first-seen order, load `account-<no>`; if suspended → `Akun <no> nonaktif`.
     Then `post()` with `periodClosed` from the period stream of `date[0:7]`.
   - **ReverseJournal**: load the original journal stream, decide `Reverse`, append `JournalReversed`, then `post()`
     the reversal journal (`description = "Pembalik <id>"` plus `": <reason>"` when the reason is non-empty, lines with
     sides swapped, `reverses = original id`, `periodClosed` from the reversal date). If the reversal date's period is
     closed, the whole transaction rolls back, including `JournalReversed`.
   - **OpenAccount / RenameAccount / SuspendAccount**: load `account-<no>`. For Open with `parentNo`, `parentExists`
     means the parent stream's state is not `none`. An account imported straight into `accounts` without a stream
     counts as missing here (parity with TS; ADR-0004). Rename to the same name emits no events, and the result's
     `globalPosition` is `0`.
   - **ClosePeriod / ReopenPeriod**: decide, append, `maybeSnapshot`.
6. `post()`: load the journal stream; `number = given ?? (state is none ? nextNumber(date) : undefined)`; decide; append.
7. Insert into `command_results`, commit, return `{ globalPosition, streams }`.

### 5.2 Decider errors (exact strings; `DomainError` → HTTP 409)

| Aggregate | Condition (in check order) | Message |
|---|---|---|
| Journal Post | already posted or reversed | `Jurnal <journalId> sudah diposting` |
| | period closed | `Periode <yyyy-mm> sudah ditutup` |
| | debit ≠ credit | `Debit (<d>) dan kredit (<c>) tidak seimbang` (cents) |
| | debit = 0 | `Jurnal tanpa nilai` |
| Journal Reverse | not found | `Jurnal tidak ditemukan` |
| | already reversed | `Jurnal <journalId> sudah dibalik` |
| Period | close when closed | `Periode <period> sudah ditutup` |
| | reopen when open | `Periode <period> belum ditutup` |
| Account | open when exists | `Akun <no> sudah ada` |
| | parent missing | `Akun induk <parentNo> tidak ditemukan` |
| | rename or suspend when none | `Akun tidak ditemukan` |
| | suspend when suspended | `Akun <no> sudah nonaktif` |
| Handler | unknown accounts | `Akun tidak dikenal: <comma-space list>` |
| | suspended line account | `Akun <no> nonaktif` |
| Store | unique violation `23505` on append | `Stream <streamId> is not at version <expected>` (409) |

In Go, detect `23505` with `errors.As(err, &pgconn.PgError)`. Only the `events` unique index can raise it inside
`append`.

### 5.3 Projections and read-your-writes

- `catchUp(p, batch=500)`: per batch, in one transaction: ensure the checkpoint row exists, lock it `FOR UPDATE`,
  `readAll(after, 500)`, apply each event, advance the checkpoint if any were applied. Loop while the batch was full.
- `rebuild(p)`: one transaction truncates `account_daily_balances, period_summaries, journal_lines, journals` and
  deletes the checkpoint, then `catchUp`.
- `waitFor(position, 5s)`: poll `COALESCE(MIN(global_position),0)` from `projection_checkpoints` every 50 ms.
  Timeout raises a plain error (→ 500).
- Worker loop: `catchUp` every projection, then relay the outbox; sleep 250 ms when nothing was processed. Stop
  between iterations on shutdown.

## 6. Behaviour spec: HTTP

### 6.1 Routes

All routes are under `/api`. Everything except `/api/auth/*` requires a valid session.

| Method + path | Input | Success |
|---|---|---|
| `POST /api/auth/login` | JSON `{ email, password }` | 200 `{ ok: true }` + `Set-Cookie` |
| `POST /api/auth/logout` | cookie (optional) | 200 `{ ok: true }` + clearing `Set-Cookie` |
| `GET /api/me` | | 200 `{ userId }` |
| `POST /api/ledger/commands` | JSON command (§6.4) | **202** `{ globalPosition, streams }` |
| `GET /api/reports/trial-balance` | `from, to, showZeroBalance?, showParentAccount?, after?` | 200 `TrialBalanceRow[]` |
| `GET /api/reports/profit-loss` | trial-balance query | 200 `StatementLine[]` |
| `GET /api/reports/balance-sheet` | `asOf, showZeroBalance?, showParentAccount?` | 200 `StatementLine[]` |
| `GET /api/reports/general-ledger/{report}` | `report ∈ journal-list, all-journals, history, summary, detail, account-journal-detail, account-list`; trial-balance query | 200 `string[][]` |
| `GET /api/reports/retained-earnings` | `year` (int 1900–9999, coerced) | 200 |
| `GET /api/reports/owner-equity-change` | trial-balance query | 200 |
| `GET /api/reports/cash-flow/{report}` | `report ∈ direct, indirect, indirect-detail`; trial-balance query; `monthly=true` | 200 |
| `GET /api/reports/financial-ratios` | `year` (1900–9999), `month?` (1–12) | 200 |
| `GET /api/reports/cash-bank/{report}` | `report ∈ bank-book, cash-flow-by-account`; repeated `bank`; trial-balance query | 200 |
| `GET /api/reports/cash-bank/cash-list` | `asOf` | 200 |
| `GET /*` (anything else) | | embedded SPA (§6.6) |

`after` on trial-balance: `Number(after)`; when the result is 0 or `NaN` there is no wait. Only trial-balance supports it.

### 6.2 Error mapping

| Cause | Status | Body |
|---|---|---|
| Validation | 422 | `{ error: "validation", issues: [...] }` |
| `DomainError`, `ConcurrencyError` | 409 | `{ error: "<message>" }` |
| No or expired session on a protected route | 401 | `{ error: "unauthenticated" }` |
| Wrong email or password | 401 | `{ error: "Email atau kata sandi salah" }` |
| Anything else (bad JSON, missing `ledger_settings`, `waitFor` timeout) | 500 | `{ error: "internal" }` (logged) |

`issues`: the web app only checks `res.ok`, so Go emits `[{ code, path, message }]`, a subset of Zod's issue
objects. This is the only planned shape difference in error bodies and is listed in §9.

### 6.3 Routing quirks (verified against Hono 4.13 on 2026-10-18)

The Go router must reproduce these during the port. Fixing them is deviation D1, after cutover.
- Query keys repeated: `c.req.query()` takes the **first** value; `bank` reads all values in order.
- `GET /api/<unknown>` with a valid session → 200 with the SPA `index.html`. Without a session → 401 JSON.
- `GET` with a path enum miss (for example `/api/reports/cash-flow/foo`) → same as above: SPA 200 when authenticated.
- Non-GET on an unknown `/api` path → 404 `text/plain` `404 Not Found` (401 first when there is no session).
- Malformed JSON body → 500 `{ error: "internal" }`.
- Login `Set-Cookie`: `nl_session=<id>; Max-Age=604800; Path=/; HttpOnly; SameSite=Strict`, plus `; Secure` when
  `NODE_ENV=production`. Logout: `nl_session=; Max-Age=0; Path=/`.

### 6.4 Input validation (port of the Zod schemas)

The Zod schemas in `packages/schemas` stay as the source of truth for the web forms. Go reimplements them. A shared
corpus of valid and invalid inputs (§8.1) keeps the two in sync.

| Field | Rule |
|---|---|
| `idempotencyKey` | string, length ≥ 8, not trimmed |
| `journalId`, `reversalJournalId` | Zod v4 `uuid()`: RFC 9562 version nibble 1–8 and variant `8,9,a,b`, plus nil and max UUIDs. Example: `00000000-0000-0000-0000-000000000001` is **rejected**. Copy the regex from the installed Zod version. |
| `date` | `^\d{4}-\d{2}-\d{2}$` (`Tanggal harus YYYY-MM-DD`). Format only; `2031-02-30` passes, as in TS. |
| `period` | `^\d{4}-\d{2}$` (`Periode harus YYYY-MM`) |
| `lines` | at least 2; `account` non-empty; `side` ∈ `DEBIT, CREDIT`; `memo` optional string |
| `amount` (command input) | See below. |
| `no`, `parentNo` | trimmed, 1–40 chars |
| `name` | trimmed, ≥ 1 char |
| `accountType` | one of the 16 values in `accountType` |
| `description`, `reason` | optional, default `""` |
| report booleans | boolean or Zod v4 `stringbool`: case-insensitive `true,1,yes,on,y,enabled` / `false,0,no,off,n,disabled`; anything else → 422. Defaults: `showZeroBalance=false`, `showParentAccount=true`. |
| `email` (login) | Zod v4 `z.email()` regex, then lowercased for lookup |
| `password` (login) | length ≥ 8 |

**`amount` needs care; this is where money enters the system.** TS does `String(v).trim()`, checks
`^\d+(\.\d{1,2})?$` (`Nilai maksimal 2 desimal`), computes `int*100 + frac`, then requires a positive safe integer.
For a JSON **string**, Go applies the same steps to the text. For a JSON **number**, JavaScript has already parsed it
to a float64, so `String(v)` is the shortest round-trip form, and Go must do the same:
- Decode with `json.Number`, parse to float64, format with JavaScript's `Number#toString` rules:
  `strconv.FormatFloat(f, 'f', -1, 64)` when `1e-6 ≤ |f| < 1e21`, exponent form otherwise (which then fails the regex).
- Consequences to reproduce: `100.000` → `"100"` → 10000 cents (accepted); `1500.10` → `"1500.1"` → 150010;
  `1e21` → rejected; `0.1+0.2`-style values with long fractions → rejected.
- Compute cents in int64 and reject anything above 9,007,199,254,740,991 (Zod's safe-integer bound) or ≤ 0.

### 6.5 Auth

- `createUser(email, password)`: insert lowercased email with an argon2id PHC hash. Go uses the same parameters
  (`m=65536, t=2, p=1`, 32-byte key, 16-byte salt, as the dummy hash in `auth.ts` shows) so hashes stay
  interchangeable. P0 still adds a fixture made by a real `Bun.password.hash` call.
- Login: look up by lowercased email. When the user is missing, verify against the dummy hash anyway (constant-ish
  timing). A verify error counts as a mismatch. Session id = 32 random bytes, base64url without padding. Store
  `sha256(id)` as lowercase hex, `expires_at = now() + interval '7 days'`.
- Session check: `SELECT user_id FROM sessions WHERE id_hash = $1 AND expires_at > now()`. Expired rows are never
  cleaned up (parity; deviation D4).
- Logout: delete the session row by hash if a cookie is present; always clear the cookie.

### 6.6 SPA

Paths are looked up without the leading `/` (empty → `index.html`). A miss serves `index.html`. If nothing is
embedded: 404 text `SPA not embedded; run \`bun run build\``. Content types: `html, js, css, svg, png, woff2, json, ico`
as in `spa.ts`, otherwise `application/octet-stream`. `Cache-Control`: `public, max-age=31536000, immutable` for
`assets/*`, `no-cache` otherwise.

### 6.7 Config and CLI

`DATABASE_URL` (required), `PORT` (default 3000), `NODE_ENV` (only `production` matters: the Secure cookie flag),
`NL_PASSWORD` (create-user). Tests: `TEST_DATABASE_URL`. Same argv shapes as today:
`northline-api --role=web|worker|all`, `northline-api create-user <email>`, `northline-api rebuild ledger`.

## 7. Report computation: porting hazards

Reports are pure functions, and the fixtures check them to the printed digit. These are the places where Go and
JavaScript disagree by default:

| Hazard | JS behaviour | Go rule |
|---|---|---|
| Rounding | `Math.round` rounds .5 toward +∞ (`-2.5 → -2`) | Use `math.Floor(x + 0.5)`, never `math.Round` (which gives `-3`). Applies to `financial-ratios.ts` `round()` and the `% Var.` column in `financial-statements.ts`. |
| Negative zero | `JSON.stringify(-0)` → `0`; `round()` already normalises | Normalise `-0` before encoding; Go's encoder prints `-0`. |
| NaN / ±Inf | `JSON.stringify` → `null` | Go's `encoding/json` fails. Map to `null` (the guards in `div` should prevent these; assert it in tests). |
| Float operation order | IEEE float64 | Same float64, but keep the exact expression order (`v * 10**d / 10**d`, `(a+b)/2`). |
| Sort stability | `Array.prototype.sort` is stable | Use `slices.SortStableFunc`. Comparators that never return 0 (`a < b ? -1 : 1`) keep their exact form. |
| String compare | UTF-16 code units | Go compares UTF-8 bytes. Same for ASCII account numbers; add a guard test with a non-ASCII number. Leave SQL `ORDER BY` in SQL (database collation), never move a sort between SQL and Go. |
| Integers | Cents as `Number` (safe to 2^53) | `int64` everywhere; pgx scans `bigint` directly. |
| Dates | ISO strings compared lexically, `Date.UTC` month-end math | Keep string compare; use `time.Date(y, m+1, 0, …, time.UTC)` for month ends; no local time zone anywhere. |
| JSON arrays | `[]` | Go `nil` slices encode as `null`; always initialise slices that are returned. |
| `formatIdr` | `.` thousands, `,` decimals, trailing zeros trimmed, `-` prefix | Port verbatim, plus a table test including negative and fractional values. |

## 8. Verification

A port is not done when the Go tests pass. It is done when Go and TypeScript produce identical bytes on identical
input.

### 8.1 Ported test suites (gate for each phase)

- Every test in `apps/api/test/*.test.ts` gets a Go twin that reads the **same** `docs/reports/fixtures/*.json` and
  uses the same per-schema isolation (`search_path`).
- Validation corpus `parity/inputs.json`: valid and invalid commands and query strings, each with the expected
  status and message. Run against the Zod schemas (Bun) and the Go validators.

### 8.2 Differential harness (`parity/`)

Two schemas on one Postgres, one per implementation. A driver sends the same command sequence to both, then compares:

1. `events` rows minus `created_at`. `global_position` must match too, given the same sequence on a fresh schema.
2. `outbox` payloads, `command_results`, `snapshots`, `number_sequences`.
3. Every read-model table, as a sorted dump.
4. Every report endpoint over a grid of dates (month starts and ends, fiscal-year boundaries, empty ranges) and flags.
5. HTTP status, headers that matter (`content-type`, `set-cookie`, `cache-control`) and body for the input corpus and the
   quirks in §6.3.

Command sequences: the fixture journals, then a property-based generator (random balanced and unbalanced journals,
reversals, period close/reopen, account open/rename/suspend, duplicate idempotency keys). The gate is zero diffs over
10,000 generated commands.

### 8.3 Cross-implementation replay (the rollback guarantee)

- Go `rebuild ledger` on events written by TS → read-model checksum equal to TS's own rebuild.
- TS `rebuild ledger` on events written by Go → same checksum.
- `handle` in either implementation on a stream written by the other (for example reverse a journal posted by TS
  using Go) behaves the same.

### 8.4 Invariant and concurrency tests (Go)

- After every generated sequence: `SUM(debit) = SUM(credit)` per journal and overall; balance sheet equation holds;
  `count(journals) = count(JournalPosted events)`; checkpoint = `MAX(global_position)` after `catchUp`.
- Concurrency: 32 goroutines posting and reversing at once while the worker runs; assert no lost events in read
  models (catches R1 below), every idempotency key applied once, and no `ConcurrencyError` leaking as 500.
- Append-only triggers and the deferred balance constraint still fire through pgx (same tests as TS).

## 9. Risks and pre-existing integrity issues

| # | Risk | Impact | Action |
|---|---|---|---|
| R1 | **Projection can skip events under concurrent commits.** `global_position` is an identity value assigned at insert, not at commit. If transaction A takes position 10, B takes 11 and commits first, the projector can read 11, move the checkpoint to 11, and never see 10 when A commits. That journal then never reaches `journals`, `journal_lines` or the balances, so reports go wrong without any error. Present in TS today. | High: silent report error | Fix in TS **before** the port (P0) so both implementations share the fix. Smallest fix: `SELECT pg_advisory_xact_lock(<constant>)` at the start of `append`, which serialises event writers (fine at ERP write volumes). Alternative without a global lock: the projector reads only events whose `xmin` is below `pg_snapshot_xmin(pg_current_snapshot())`. Add the concurrency test in §8.4 to both suites. |
| R2 | Two writers or two workers during cutover | Duplicate relay sends; projection checkpoint contention | Exactly one implementation runs the worker role at any time. Both web roles may run during shadow reads (read-only). |
| R3 | Idempotency replay ignores payload differences | A retried command with a changed body silently returns the old result | Parity during the port. Deviation D3 after cutover: store a hash of the parsed command and return 409 on mismatch. |
| R4 | Amount parsing of JSON numbers (§6.4) | Wrong cents stored permanently in an append-only log | Corpus tests with numeric edge cases before P2 is merged. |
| R5 | Missing-vs-null and `""` in payloads (§4.2) | Event shape drift that later upcasters must handle | Differential event diff (§8.2) is a hard gate. |
| R6 | Argon2 parameter or encoding mismatch | Users cannot log in after cutover | P0 fixture: hash made by Bun, verified by Go and the other way round. |
| R7 | Web client loses its typed contract when `hono/client` goes | Frontend type errors or silent shape drift | P7 replaces it with `fetch` + the existing Zod schemas (`trialBalanceRow` exists already). |

## 10. Decisions needed

| # | Decision | Recommendation |
|---|---|---|
| D1 | Fix the routing quirks in §6.3 (unknown `/api/*` → SPA 200, bad JSON → 500)? | Yes, after cutover: JSON 404 for unknown `/api/*`, 400 for malformed JSON. |
| D2 | Outbox relay target. Nothing consumes pg-boss today. | Keep writing outbox rows (that is the durable contract) and port the relay to River (`riverqueue/river`, pgx-native), deduplicating on the outbox id. Smaller option: do not port the relay until the first consumer exists; rows wait with `relayed_at IS NULL` and nothing is lost. |
| D3 | Idempotency payload check (R3) | Yes, after cutover. |
| D4 | Expired session cleanup | Delete expired rows in the worker loop, after cutover. |
| D5 | API contract for the web app | `fetch` + Zod parse with `packages/schemas` (no codegen). Upgrade to an OpenAPI file when a second client appears. |
| D6 | R1 fix variant | Global advisory lock in `append` (simplest, easy to test). |

## 11. Phased plan

Each phase ends with its gate green on CI and a commit. TS keeps serving production until P8.

**P0: Baseline and freeze (TypeScript).**
- Fix R1 in `src/es/store.ts` and add the concurrency test.
- Add characterization tests for §6.3, the cookie headers, and amount edge cases.
- Produce the Bun argon2 hash fixture and `parity/inputs.json`.
- Write ADR-0005 ("Port the API to Go"; it supersedes the runtime choice in ADR-0002, while the hand-rolled store
  decision stays).
- Gate: TS suite green, including the new tests.

**P1: Go skeleton.**
- `go.mod`, pgx pool, `migrate` with `go:embed`. Move `migrations/` into `apps/api-go/migrations` and point the TS
  imports in `src/db.ts` at the new path, so one copy exists.
- CLI argument parsing, signal handling.
- Gate: Go `migrate` on a TS-migrated database is a no-op; on an empty database it produces a schema identical to
  TS's (`pg_dump --schema-only` diff).

**P2: Write side.**
- `es` store, deciders (pure, table-tested against every message in §5.2), command parsing and validation, `handle`,
  `nextNumber`, snapshots.
- Gate: validation corpus, decider tests, differential diff of the write-side tables (§8.2 items 1–2).

**P3: Read side.**
- Ledger projection, `catchUp`, `rebuild`, `waitFor`, worker loop.
- Gate: cross-implementation replay (§8.3), invariant and concurrency tests (§8.4).

**P4: Reports.**
- Port in dependency order: `trial-balance` → `financial-statements` → `general-ledger` → `equity` → `cash-bank` →
  `cash-flow` → `financial-ratios` → `queries`. One commit per file, with its fixture tests.
- Gate: every fixture in `docs/reports/fixtures` passes in Go; report grid diff (§8.2 item 4) is zero.

**P5: HTTP, auth, SPA.**
- Routes, error mapping, quirks, cookie auth, SPA embedding.
- Gate: HTTP differential (§8.2 item 5); a login with a Bun-created user works.

**P6: Relay.**
- Per D2.
- Gate: at-least-once test (kill between send and update → resent, deduplicated).

**P7: Web client.**
- Replace `hc<AppType>` in `apps/web/src/api/client.ts` and its two call sites with `fetch` + Zod parsing.
- Drop `hono` from `apps/web`, and drop `apps/api/types` plus `tsconfig.types.json`.
- Gate: web typecheck; sign-in and trial balance work against the Go binary in the browser.

**P8: Shadow and cutover.**
1. Build and ship the Go image (`golang` build stage → `gcr.io/distroless/static`, same `PORT`, same args, same
   entrypoint).
2. Shadow: run Go `--role=web` against a production read replica; replay a sample of production GET traffic to both;
   diff responses for an agreed period with zero unexplained diffs.
3. Cutover: take a `pg_dump` backup, stop the TS worker and web, start Go `--role=all` on the same database. No data
   migration is needed, because the schema and data are unchanged.
4. Rollback: stop Go, start the previous TS image. §8.3 makes this safe for data written in between.

**P9: Decommission.**
- Delete the TS sources, `hono`, `drizzle-orm`, `pg-boss`, `postgres` and the Bun build scripts. Rename
  `apps/api-go` to `apps/api`. Update `apps/api/README.md`, the root scripts and ADR-0002's consequences.
- Then land the deviations D1, D3 and D4 one at a time.

## 12. Definition of done

- Every route, CLI command and role in §5–§6 exists in Go, with the same status codes, bodies and cookie headers
  (except the listed deviations, after cutover).
- Zero diffs in the differential harness over 10,000 generated commands, and in cross-implementation replay both ways.
- All Accurate fixtures pass in Go.
- R1 fixed and covered by a concurrency test.
- Users created by the TS service can log in through Go.
- TypeScript API code and Hono removed; the docs describe the Go service.
