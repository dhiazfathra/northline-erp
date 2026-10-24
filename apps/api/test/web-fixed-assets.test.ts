import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import t5 from '../../../docs/reports/fixtures/fixed-asset-t5.json'
import { createApp } from '../src/app'
import { createFixedAsset, runPeriodEnd } from '../src/fixed-assets/service'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createFullUser, fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>, app: ReturnType<typeof createApp>, cookie: string
beforeAll(async () => {
  f = await fixtureDb('web_fa')
  for (const a of t5.accounts) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  await createFixedAsset(f.db, { idempotencyKey: 'web-fa-asset', ...t5.asset })
  await runPeriodEnd(f.db, { idempotencyKey: 'web-fa-pe', period: '2034-01' })
  app = createApp(f.db)
  await createFullUser(f.db, 'fa@example.test', 'rahasia-123')
  const res = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'fa@example.test', password: 'rahasia-123' }) })
  cookie = res.headers.get('set-cookie')!.split(';')[0]!
}, 60_000)
afterAll(() => f.close())

const get = (path: string) => app.request(path, { headers: { cookie } })
const post = (path: string, body: unknown) => app.request(path, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) })

test('GET /api/fixed-assets lists assets in rupiah with status and last depreciation', async () => {
  const res = await get('/api/fixed-assets')
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual([{
    number: t5.asset.number, description: t5.asset.description, category: t5.asset.category, date: t5.asset.date, usageDate: t5.asset.usageDate,
    lifeMonths: 24, assetAccount: '120005', accumulatedAccount: '12000604', expenseAccount: '600024',
    location: '', department: '', note: '', tax: false, qty: 1, salvage: 0, status: 'active', lastDep: '2034-01-31',
    expenditures: [{ name: 'NL-T5 perolehan', date: '2034-01-15', amount: 12_000_000, account: 'NL-T1-3001' }],
  }])
})

test('GET /api/fixed-assets/:number returns one asset, 404 when missing', async () => {
  expect(((await (await get(`/api/fixed-assets/${t5.asset.number}`)).json()) as { number: string }).number).toBe(t5.asset.number)
  expect((await get('/api/fixed-assets/NOPE')).status).toBe(404)
})

test('form details round-trip through POST and GET; salvage lowers depreciation', async () => {
  const res = await post('/api/fixed-assets', { idempotencyKey: 'web-fa-details', number: 'FAA.2034.02.00009', description: 'Meja', category: 'Kantor', date: '2034-02-01', lifeMonths: 10,
    assetAccount: '120005', accumulatedAccount: '12000604', expenseAccount: '600024', expenditures: [{ name: 'beli', date: '2034-02-01', amount: 1_200, account: 'NL-T1-3001' }],
    location: 'Kantor Pusat', department: 'Umum', note: 'lantai 2', tax: true, qty: 3, salvage: 200 })
  expect(res.status).toBe(201)
  const a = (await (await get('/api/fixed-assets/FAA.2034.02.00009')).json()) as Record<string, unknown>
  expect({ location: a.location, department: a.department, note: a.note, tax: a.tax, qty: a.qty, salvage: a.salvage }).toEqual({ location: 'Kantor Pusat', department: 'Umum', note: 'lantai 2', tax: true, qty: 3, salvage: 200 })
  await runPeriodEnd(f.db, { idempotencyKey: 'web-fa-pe2', period: '2034-02' })
  const [d] = await f.db.execute(sql`SELECT amount FROM depreciations WHERE asset_number = 'FAA.2034.02.00009'`)
  expect(Number(d!.amount)).toBe(10_000) // (1,200 - 200) / 10 months, in cents
  expect((await post('/api/fixed-assets', { idempotencyKey: 'web-fa-bad-salvage', description: 'X', category: 'K', date: '2034-02-01', lifeMonths: 10, assetAccount: '120005',
    accumulatedAccount: '12000604', expenseAccount: '600024', expenditures: [{ name: 'b', date: '2034-02-01', amount: 100, account: 'NL-T1-3001' }], salvage: 100 })).status).toBe(409)
})

test('Aset per Lokasi groups held assets by branch location with the branch address', async () => {
  await f.db.execute(sql`UPDATE branches SET address = 'Jl. Sudirman 1' WHERE name = 'Kantor Pusat'`)
  expect(await (await get('/api/fixed-assets/locations?date=2034-12-31')).json()).toEqual([{ name: 'Kantor Pusat', address: 'Jl. Sudirman 1', qty: 3 }])
  expect(await (await get('/api/fixed-assets/locations?date=2034-01-31')).json()).toEqual([])
  expect(await (await get('/api/fixed-assets/branches')).json()).toEqual(['Kantor Pusat'])
})

test('Pengeluaran Aset: POST numbers a draft on the default branch, GET lists it; down payment refused', async () => {
  const doc = { idempotencyKey: 'web-ax-1', date: '2034-03-05', description: 'Servis', dpp: 1_000_000, lines: [{ code: t5.asset.number, qty: 2, note: '' }] }
  const res = await post('/api/fixed-assets/expenditures', doc)
  expect(res.status).toBe(201)
  expect(await res.json()).toEqual({ number: 'AX.2034.03.00001' })
  expect(await (await get('/api/fixed-assets/expenditures')).json()).toEqual([{ id: 'AX.2034.03.00001', number: 'AX.2034.03.00001', date: '05/03/2034', description: 'Servis', qty: 2, total: 1_110_000, status: 'Draf', branch: 'Kantor Pusat' }])
  expect((await post('/api/fixed-assets/expenditures', { ...doc, idempotencyKey: 'web-ax-2', applyDp: true })).status).toBe(409)
  expect((await post('/api/fixed-assets/expenditures', { ...doc, idempotencyKey: 'web-ax-3', lines: [] })).status).toBe(422)
})

test('deleting an asset named on a Pengeluaran Aset is refused with 409', async () => {
  const asset = { idempotencyKey: 'web-fa-del', number: 'FAA.2035.01.00001', description: 'Kursi', category: 'Kantor', date: '2035-01-01', lifeMonths: 10,
    assetAccount: '120005', accumulatedAccount: '12000604', expenseAccount: '600024', expenditures: [{ name: 'beli', date: '2035-01-01', amount: 100, account: 'NL-T1-3001' }] }
  expect((await post('/api/fixed-assets', asset)).status).toBe(201)
  expect((await post('/api/fixed-assets/expenditures', { idempotencyKey: 'web-ax-del', date: '2035-01-02', description: 'Servis', dpp: 10, lines: [{ code: asset.number, qty: 1 }] })).status).toBe(201)
  const del = await app.request(`/api/fixed-assets/${asset.number}`, { method: 'DELETE', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ idempotencyKey: 'web-fa-del-2' }) })
  expect(del.status).toBe(409)
  expect(await del.json()).toEqual({ error: 'Aset FAA.2035.01.00001 dipakai di Pengeluaran Aset AX.2035.01.00001' })
})
