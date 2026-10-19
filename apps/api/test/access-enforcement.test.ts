import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import { inspectRoutes } from 'hono/dev'
import { createApp } from '../src/app'
import { createUser } from '../src/auth'
import { PRIVILEGES } from '../src/access/service'
import { FULL_ACCESS, PUBLIC_ROUTES, ROUTE_PRIVILEGES, SESSION_ROUTES, requiredPrivilege } from '../src/route-privileges'
import { createFullUser, fixtureDb } from './fixture-db'

// Route x role matrix (P5, ADR-0040), generated from the live hono route table.
const routes = inspectRoutes(createApp({} as any)).filter(r => !r.isMiddleware && r.method !== 'ALL').map(r => ({ method: r.method, path: r.path, id: `${r.method} ${r.path}` }))

/** Every concrete path a route serves: each `:p{a|b}` alternative, plain `:p` as `x`. */
const expand = (path: string): string[] => {
  const m = path.match(/:\w+(\{([^}]*)\})?/)
  if (!m) return [path]
  return (m[2] ? m[2].split('|') : ['x']).flatMap(v => expand(path.replace(m[0], v)))
}

test('no route unlisted: every route is public, session-only or mapped, and every mapping names a catalog key', () => {
  const ids = new Set(routes.map(r => r.id))
  const unlisted = routes.filter(r => !PUBLIC_ROUTES.includes(r.id) && !SESSION_ROUTES.includes(r.id) && !(r.id in ROUTE_PRIVILEGES)).map(r => r.id)
  expect(unlisted).toEqual([])
  expect(Object.keys(ROUTE_PRIVILEGES).filter(k => !ids.has(k))).toEqual([]) // no stale rows
  for (const r of routes.filter(r => r.id in ROUTE_PRIVILEGES)) for (const p of expand(r.path)) {
    const need = requiredPrivilege(r.method, r.path, p)
    expect({ p, need: need ?? null }).toEqual({ p, need: expect.anything() })
    if (need!.key !== FULL_ACCESS) expect(PRIVILEGES.has(need!.key)).toBe(true)
  }
})

let f: Awaited<ReturnType<typeof fixtureDb>>, app: ReturnType<typeof createApp>
const cookies: Record<string, string> = {}
beforeAll(async () => {
  f = await fixtureDb('access_enf')
  app = createApp(f.db)
  await createFullUser(f.db, 'nl-full@example.test', 'rahasia-123')
  await createUser(f.db, 'nl-none@example.test', 'rahasia-123')
  await createUser(f.db, 'nl-granted@example.test', 'rahasia-123')
  const [u] = await f.db.execute(sql`SELECT id FROM users WHERE email = 'nl-granted@example.test'`)
  await f.db.execute(sql`INSERT INTO access_groups (name) VALUES ('matrix')`)
  await f.db.execute(sql`INSERT INTO access_group_users VALUES ('matrix', ${u!.id})`)
  for (const role of ['full', 'none', 'granted']) {
    const res = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `nl-${role}@example.test`, password: 'rahasia-123' }) })
    cookies[role] = res.headers.get('set-cookie')!.split(';')[0]!
  }
}, 60_000)
afterAll(async () => { await f.close() })

const grant = (privileges: Record<string, string[]>) => f.db.execute(sql`UPDATE access_groups SET privileges = ${JSON.stringify(privileges)}::jsonb WHERE name = 'matrix'`)
const call = async (method: string, path: string, role?: string) => {
  const res = await app.request(path, { method, headers: { 'content-type': 'application/json', ...(role ? { cookie: cookies[role]! } : {}) }, body: method === 'GET' ? undefined : '{}' })
  await res.arrayBuffer()
  return res.status
}
// Allowed = the handler ran: its own answer to an empty body (200/201, 404, 409/422; 12 POST/PUT handlers throw a 500
// on `{}` without enforcement too), never 401/403.
const allowed = (s: number) => s !== 401 && s !== 403

test('matrix: denied roles get 403, granted roles reach the handler', async () => {
  const rows: string[] = []
  for (const r of routes) for (const p of expand(r.path)) {
    const row = (role: string, s: number, ok: boolean) => { if (!ok) rows.push(`${role} ${r.method} ${p} -> ${s}`) }
    if (PUBLIC_ROUTES.includes(r.id)) { const s = await call(r.method, p); row('anon', s, allowed(s)); continue }
    const anon = await call(r.method, p); row('anon', anon, anon === 401)
    if (SESSION_ROUTES.includes(r.id)) { const s = await call(r.method, p, 'none'); row('none', s, allowed(s)); continue }
    const need = requiredPrivilege(r.method, r.path, p)!
    const none = await call(r.method, p, 'none'); row('none', none, none === 403)
    // every other key with every action, but not this one: still denied
    if (need.key !== FULL_ACCESS) {
      await grant(Object.fromEntries([...PRIVILEGES.keys()].filter(k => k !== need.key).map(k => [k, ['enable', 'create', 'edit', 'delete', 'view']])))
      const other = await call(r.method, p, 'granted'); row('others-only', other, other === 403)
      await grant({ [need.key]: [need.action] })
      const g = await call(r.method, p, 'granted'); row(`granted ${need.key}:${need.action}`, g, allowed(g))
    } else { const g = await call(r.method, p, 'granted'); row('group (full-access route)', g, g === 403) }
    const full = await call(r.method, p, 'full'); row('full', full, allowed(full))
  }
  expect(rows).toEqual([])
}, 300_000)

test('a view grant does not allow create', async () => {
  await grant({ 'penjualan.faktur_penjualan': ['view'] })
  expect(await call('POST', '/api/sales/invoices', 'granted')).toBe(403)
  await grant({ 'penjualan.faktur_penjualan': ['create'] })
  expect(await call('POST', '/api/sales/invoices', 'granted')).toBe(422)
})

test('migration 0058: users created before it keep full access, new ones default to none', async () => {
  const [d] = await f.db.execute(sql`SELECT column_default FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_access' AND table_schema = current_schema()`)
  expect(d!.column_default).toBe('false')
  const { client } = f
  const schema = `access_enf_mig_${process.pid}`
  await client.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema}`)
  try {
    await client.unsafe(`CREATE TABLE ${schema}.users (id int, email text); INSERT INTO ${schema}.users VALUES (1, 'old@example.test')`)
    const { default: m } = await import('../migrations/0058_access_enforcement.sql', { with: { type: 'text' } })
    await client.unsafe((m as unknown as string).replaceAll('TABLE users', `TABLE ${schema}.users`))
    await client.unsafe(`INSERT INTO ${schema}.users VALUES (2, 'new@example.test')`)
    expect((await client.unsafe(`SELECT id, full_access FROM ${schema}.users ORDER BY id`)).map(r => [r.id, r.full_access])).toEqual([[1, true], [2, false]])
  } finally { await client.unsafe(`DROP SCHEMA ${schema} CASCADE`) }
})
