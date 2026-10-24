import { afterAll, beforeAll, expect, test } from 'bun:test'
import { createApp } from '../src/app'
import { createFullUser, fixtureDb } from './fixture-db'

// Buku Besar screen routes (ADR-0049, src/web/ledger.ts).
let f: Awaited<ReturnType<typeof fixtureDb>>, app: ReturnType<typeof createApp>, cookie = ''
beforeAll(async () => {
  f = await fixtureDb('web_ledger')
  app = createApp(f.db)
  await createFullUser(f.db, 'nl-ledger@example.test', 'rahasia-123')
  const res = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nl-ledger@example.test', password: 'rahasia-123' }) })
  cookie = res.headers.get('set-cookie')!.split(';')[0]!
}, 60_000)
afterAll(() => f.close())

const call = async (method: string, path: string, body?: unknown) => {
  const res = await app.request(path, { method, headers: { 'content-type': 'application/json', cookie }, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: res.status, json: (await res.json()) as any }
}

test('accounts: balance in cents on the normal side; lines of the account', async () => {
  const { status, json } = await call('GET', '/api/ledger/accounts')
  expect(status).toBe(200)
  const kas = json.find((a: any) => a.no === 'NL-T1-1101'), modal = json.find((a: any) => a.no === 'NL-T1-3001')
  expect(kas).toMatchObject({ type: 'CASH_BANK', parentNo: null, suspended: false, note: '', bank: '', allUsers: true, users: [] })
  const det = { note: 'kas kecil', bank: 'BCA', accNo: '123', accName: 'PT NL', allUsers: false, users: ['Budi'] }
  expect((await call('PUT', '/api/ledger/accounts/NL-T1-1101/details', det)).status).toBe(200)
  expect((await call('GET', '/api/ledger/accounts')).json.find((a: any) => a.no === 'NL-T1-1101')).toMatchObject(det)
  expect((await call('PUT', '/api/ledger/accounts/NL-T1-1101/details', { ...det, users: 'x' })).status).toBe(422)
  expect(modal.balance).toBeGreaterThan(0) // credit-normal shown positive
  const lines = (await call('GET', '/api/ledger/accounts/NL-T1-1101/lines')).json
  expect(lines.length).toBeGreaterThan(0)
  expect(lines[0]).toMatchObject({ date: '2030-12-15', description: 'NL-T1 setoran modal', debit: 1_000_000_000, credit: 0 })
})

test('banks: entries in range, reconciling one marks it matched', async () => {
  const q = '/api/ledger/banks?from=2030-12-01&to=2031-12-31'
  const [bank] = (await call('GET', q)).json
  expect(bank.no).toBe('NL-T1-1101')
  const e = bank.entries[0]
  expect(e.matched).toBe(false)
  expect((await call('POST', '/api/ledger/banks/reconcile', { bank: 'NL-T1-1101', document: e.no, statementDate: e.date })).status).toBe(201)
  expect((await call('GET', q)).json[0].entries[0].matched).toBe(true)
  const again = await call('POST', '/api/ledger/banks/reconcile', { bank: 'NL-T1-1101', document: e.no, statementDate: e.date })
  expect(again).toEqual({ status: 409, json: { error: `${e.no} sudah direkonsiliasi` } })
  expect((await call('POST', '/api/ledger/banks/reconcile', { bank: 'NL-T1-1101', document: 'NOPE', statementDate: e.date })).status).toBe(409)
})

test('period ends: listed after POST /api/period-ends', async () => {
  expect((await call('POST', '/api/period-ends', { idempotencyKey: 'web-ledger-pe-1', period: '2031-01' })).status).toBe(201)
  expect((await call('GET', '/api/ledger/period-ends')).json).toEqual([{ period: '2031-01', number: 'Januari 2031', date: '2031-01-31' }])
})

test('features round-trip; default accounts start empty', async () => {
  expect((await call('GET', '/api/ledger/features')).json).toEqual({})
  expect((await call('PUT', '/api/ledger/features', { fx: true, budget: false })).status).toBe(200)
  expect((await call('GET', '/api/ledger/features')).json).toEqual({ fx: true, budget: false })
  expect((await call('PUT', '/api/ledger/features', { fx: 'yes' })).status).toBe(422)
  expect((await call('GET', '/api/ledger/default-accounts')).json).toEqual([])
})
