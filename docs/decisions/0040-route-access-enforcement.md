# ADR-0040: API routes enforce Akses Grup privileges; existing users keep full access, new users start with none

## Status
Accepted

## Date
2026-10-19

## Context
P3.4 stored users, access groups and their privileges (migration 0055, `src/access/privilege-catalog.json`, 466
`section.label` keys captured from Manufaktur Demo's Akses Grup), but no route checked them: any signed-in user could
call every endpoint. Phase P5 of `docs/goals/full-parity-v2.md` enforces them. Two constraints: production branches
already hold users who must keep working, and nothing may change a `done` report's output.

## Decision
- **Migration 0058** adds `users.full_access`. The column is added with default `true`, so every user that exists when
  it runs keeps full access (default-allow for current data), then the default flips to `false`, so every user created
  afterwards has no privileges until a group grants them (default-deny). `createUser(db, email, password, fullAccess)`
  and `northline-api create-user <email> --full-access` set it explicitly.
- **One mapping table**, `ROUTE_PRIVILEGES` in `apps/api/src/route-privileges.ts`, next to the router. Keys are
  `METHOD path` exactly as hono prints its route table; values are a catalog key, or a per-alternative object for
  `:report{a|b}` routes (each report maps to its own `...Report` key). The action follows the method (GET `view`,
  POST `create`, PUT `edit`, DELETE `delete`); keys whose mask lacks that action (Preferensi, Proses Akhir Bulan
  style `Aktif`-only rows) fall back to `enable`. Judgment calls carry a `shortcut:` comment.
- Routes with no catalog key (branch/department/project masters and reports, Proyek Kontraktor, job orders and roll
  overs, approvals, access-group and branch-user writes) map to `full_access`: only full-access users reach them.
  Access-group writes stay there on purpose: a grantable key would let a group grant itself everything.
- **Public** (`PUBLIC_ROUTES`): login, logout, SPA assets. **Session only** (`SESSION_ROUTES`): `/api/me`,
  `/api/openapi.json`, `/api/docs`.
- `requirePrivilege` middleware runs after `requireSession`, finds the matched route with `hono/route`'s
  `matchedRoutes`, and answers `403 {"error":"forbidden"}` unless the user has `full_access` or a group of theirs
  grants the key and action. A route missing from the table is denied.
- **Matrix test** `apps/api/test/access-enforcement.test.ts` enumerates routes with `inspectRoutes` (as the OpenAPI
  document does, ADR-0020), expands every `{a|b}` alternative, and asserts per path: anonymous 401; no grants 403; a
  group holding every other key 403; a group holding exactly the mapped key and action reaches the handler; full access
  reaches the handler. It fails when a route is in none of the three lists or a mapping names an unknown key.

## Alternatives Considered
- **Grant existing users through a seeded "Administrator" group**: rejected; groups are fixture data diffed against
  Accurate's access reports (P3.4), so an extra group would change Daftar Akses Grup's output.
- **Per-route middleware (`.get(path, guard('key'), handler)`)**: rejected; the mapping would be spread over 91 routes
  and a forgotten guard would fail open. One table plus a deny-by-default middleware fails closed.
- **Default-deny for everyone, migrate grants by hand**: rejected; it would lock out every production user on deploy.
- **Map uncatalogued routes to a nearby key** (e.g. contractor to Pekerjaan Pesanan): rejected; it would grant access
  Accurate does not, and the Kontraktor catalog has not been captured.

## Consequences
- 91 routes (231 concrete paths) are covered: 3 public, 3 session-only, 85 in the table; 12 table values are `full_access`.
- No report output changes: tests sign in through `createFullUser` (`test/fixture-db.ts`), and the access reports read
  groups only, not `full_access`.
- Not enforced yet: the group's time restriction (`restriction_days/from/to`, all captured groups are 00.00-23.59),
  per-branch user admission (`branch_users`), and Akses Lainnya flags such as "dapat mengubah tanggal". Each is a
  `shortcut:` in `route-privileges.ts`.
- Master upserts need `create` even when they update; `POST /api/cash-bank/documents` checks Pembayaran for both
  payments and deposits; one key covers every ledger command.
- New users made with `create-user` cannot do anything until added to a group or created with `--full-access`.
