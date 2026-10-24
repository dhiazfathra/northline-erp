import { afterAll, beforeAll, expect, test } from 'bun:test'
import { createApp } from '../src/app'
import { createUser } from '../src/auth'
import { createFullUser, fixtureDb } from './fixture-db'

// ADR-0049 (N1): the web app's report favourites, layouts, drill-down, overview and module lists.
let f: Awaited<ReturnType<typeof fixtureDb>>, app: ReturnType<typeof createApp>
const cookie: Record<string, string> = {}
beforeAll(async () => {
  f = await fixtureDb('web_reports')
  app = createApp(f.db)
  await createFullUser(f.db, 'nl-web-a@example.test', 'rahasia-123')
  await createUser(f.db, 'nl-web-b@example.test', 'rahasia-123')
  for (const u of ['a', 'b']) {
    const res = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `nl-web-${u}@example.test`, password: 'rahasia-123' }) })
    cookie[u] = res.headers.get('set-cookie')!.split(';')[0]!
  }
}, 60_000)
afterAll(async () => { await f.close() })

const call = async (u: string, path: string, init: RequestInit = {}) => {
  const res = await app.request(`/api/web${path}`, { ...init, headers: { 'content-type': 'application/json', cookie: cookie[u]! } })
  return { status: res.status, body: await res.json() }
}

test('favourites toggle per user', async () => {
  expect((await call('a', '/reports/favourites/neraca', { method: 'POST' })).body).toEqual({ id: 'neraca', starred: true })
  await call('a', '/reports/favourites/pajak', { method: 'POST' })
  expect((await call('a', '/reports/favourites')).body).toEqual(['neraca', 'pajak'])
  expect((await call('b', '/reports/favourites')).body).toEqual([]) // session-only route: no privilege needed, own rows only
  expect((await call('a', '/reports/favourites/neraca', { method: 'POST' })).body).toEqual({ id: 'neraca', starred: false })
  expect((await call('a', '/reports/favourites')).body).toEqual(['pajak'])
})

test('layouts: null until saved, then the saved object; per user; non-objects rejected', async () => {
  expect((await call('a', '/reports/layouts/neraca')).body).toEqual({ layout: null })
  const layout = { title: 'Neraca Saya', rows: [{ k: 'acc', t: 'Kas' }] }
  expect((await call('a', '/reports/layouts/neraca', { method: 'PUT', body: JSON.stringify(layout) })).status).toBe(200)
  await call('a', '/reports/layouts/neraca', { method: 'PUT', body: JSON.stringify({ ...layout, title: 'v2' }) })
  expect((await call('a', '/reports/layouts/neraca')).body).toEqual({ layout: { ...layout, title: 'v2' } })
  expect((await call('b', '/reports/layouts/neraca')).body).toEqual({ layout: null })
  expect((await call('a', '/reports/layouts/neraca', { method: 'PUT', body: '[1]' })).status).toBe(422)
})

test('drill: lines on the account in the period, in cents; needs the GL detail privilege', async () => {
  const r = await call('a', '/reports/drill?account=NL-T1-1101&from=2030-12-01&to=2030-12-31')
  expect(r.body[0]).toMatchObject({ date: '2030-12-15', debit: 1_000_000_000, credit: 0, desc: 'NL-T1-J1' })
  expect(r.body.every((l: { date: string }) => l.date <= '2030-12-31')).toBe(true)
  expect((await call('b', '/reports/drill?account=NL-T1-1101&from=2030-12-01&to=2030-12-31')).status).toBe(403)
})

test('overview: four KPIs, groups with counts; module lists', async () => {
  const r = await call('a', '/overview?from=2031-01-01&to=2031-12-31')
  expect(r.status).toBe(200)
  expect(r.body.kpis).toHaveLength(4)
  expect(r.body.groups.map((g: { tiles: unknown[] }) => g.tiles.length)).toEqual([3, 2, 2])
  expect(r.body.groups[0].tiles[0]).toMatchObject({ v: '0', d: '0' })
  expect((await call('a', '/modules/customers')).body).toEqual([])
  expect((await call('a', '/modules/taxes')).status).toBe(200)
  expect((await call('b', '/overview?from=2031-01-01&to=2031-12-31')).status).toBe(403)
})
