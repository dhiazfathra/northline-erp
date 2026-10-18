import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import fx from '../../../docs/reports/fixtures/activity-log-a7.json'
import { createApp } from '../src/app'
import { createUser } from '../src/auth'
import { catchUp, ledgerProjection } from '../src/projections'
import { auditList, jakartaDay, loadActivity } from '../src/reports/activity-log'
import { fixtureDb } from './fixture-db'

// Replays the NL-A7 sandbox seed (docs/reports/AuditListReport.md) through the HTTP API, in the sandbox's order.
let f: Awaited<ReturnType<typeof fixtureDb>>
let call: (method: string, path: string, body?: unknown) => Promise<Response>
beforeAll(async () => {
  f = await fixtureDb('al')
  // the invoice's customer and item existed before the seed window: inserted directly, so they log nothing
  await f.db.execute(sql`INSERT INTO customers (no, name, ar_account) VALUES ('NL-T2-C2', 'NL-T2 Pelanggan B', 'NL-T1-1201')`)
  await f.db.execute(sql`INSERT INTO items (no, name, type, unit, sales_account) VALUES ('NL-T2-S1', 'NL-T2 Jasa Konsultasi', 'SERVICE', 'Jam', 'NL-T1-4001')`)
  await createUser(f.db, 'nl-tester@example.test', 'rahasia-123')
  await f.db.execute(sql`UPDATE users SET name = 'nl-tester'`)
  const app = createApp(f.db)
  const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nl-tester@example.test', password: 'rahasia-123' }) })
  const cookie = login.headers.get('set-cookie')!.split(';')[0]!
  call = async (method, path, body) => {
    const r = await app.request('/api' + path, { method, headers: { 'content-type': 'application/json', cookie, 'cf-connecting-ip': '203.0.113.10' }, body: body === undefined ? undefined : JSON.stringify(body) })
    if (r.status >= 300) throw new Error(`${method} ${path}: ${r.status} ${await r.text()}`)
    return r
  }
})
afterAll(() => f.close())

const cmd = (type: string, key: string, body: object) => call('POST', '/ledger/commands', { type, idempotencyKey: `nl-a7-${key}`, ...body })
const jvLines = [{ account: 'NL-T1-6001', side: 'DEBIT', amount: '750000' }, { account: 'NL-T1-1101', side: 'CREDIT', amount: '750000' }]

test('AuditListReport: NL-A7 seed matches Accurate at zero diff', async () => {
  const [mark] = await f.db.execute(sql`SELECT COALESCE(MAX(id), 0)::int AS id FROM activity_log`) // fixture-db setup logs too
  const seen = Number(mark!.id)
  await cmd('OpenAccount', 'acc-1', { no: 'NL-A7-11', name: 'NL-A7 Akun', accountType: 'EXPENSE' })
  await cmd('RenameAccount', 'acc-2', { no: 'NL-A7-11', name: 'NL-A7 Akun diubah' })
  await cmd('DeleteAccount', 'acc-3', { no: 'NL-A7-11' })
  for (const [kind, body] of [['customers', { no: 'NL-A7-C1', name: 'NL-A7 Pelanggan', arAccount: 'NL-T1-1201' }], ['items', { no: 'NL-A7-I1', name: 'NL-A7 Barang', type: 'SERVICE', unit: 'Jam', salesAccount: 'NL-T1-4001' }]] as const) {
    await call('POST', `/sales/${kind}`, body)
    await call('POST', `/sales/${kind}`, { ...body, name: body.name + ' diubah' })
    await call('DELETE', `/sales/${kind}/${body.no}`)
  }
  const journalId = crypto.randomUUID()
  await cmd('PostJournal', 'jv-1', { journalId, number: 'NL-A7-JV1', date: '2038-04-20', description: 'NL-A7 jurnal', lines: jvLines })
  await cmd('EditJournal', 'jv-2', { journalId, date: '2038-04-20', description: 'NL-A7 jurnal diubah', lines: jvLines })
  await cmd('EditJournal', 'jv-3', { journalId, number: 'NL-A7-JV2', date: '2038-04-21', description: 'NL-A7 jurnal diubah', lines: jvLines })
  await cmd('DeleteJournal', 'jv-4', { journalId })
  const si = { customer: 'NL-T2-C2', date: '2038-04-20', description: 'NL-A7 faktur', lines: [{ item: 'NL-T2-S1', name: 'NL-A7 jasa', qty: 1, price: '100000' }] }
  await call('POST', '/sales/invoices', { ...si, idempotencyKey: 'nl-a7-si-1', number: 'NL-A7-SI1' })
  await call('PUT', '/sales/invoices/NL-A7-SI1', { ...si, idempotencyKey: 'nl-a7-si-2', description: 'NL-A7 faktur diubah' })
  await call('PUT', '/sales/invoices/NL-A7-SI1', { ...si, idempotencyKey: 'nl-a7-si-3', number: 'NL-A7-SI2', date: '2038-04-21', description: 'NL-A7 faktur diubah' })
  await call('DELETE', '/sales/invoices/NL-A7-SI2', { idempotencyKey: 'nl-a7-si-4' })

  // The log day is today; move every row onto the capture day (order and time of day kept) before rendering.
  const rows = (await loadActivity(f.db, '2000-01-01', '2100-12-31')).filter(r => r.id > seen)
  const shift = Date.parse(fx.from) - Date.parse(jakartaDay(rows[0]!.loggedAt))
  expect(auditList(rows.map(r => ({ ...r, loggedAt: new Date(Date.parse(r.loggedAt) + shift).toISOString() })), fx.from, fx.to)).toEqual(fx.rows)

  // edits and deletes take the journals back out of the ledger
  await catchUp(f.db, ledgerProjection)
  const [left] = await f.db.execute(sql`SELECT count(*)::int AS n, COALESCE(SUM(debit + credit), 0)::bigint AS amt FROM journal_lines WHERE date >= '2038-04-20'`)
  expect([left!.n, Number(left!.amt)]).toEqual([0, 0])
  const [bal] = await f.db.execute(sql`SELECT COALESCE(SUM(debit), 0)::bigint AS d, COALESCE(SUM(credit), 0)::bigint AS c FROM account_daily_balances WHERE date >= '2038-04-20'`)
  expect([Number(bal!.d), Number(bal!.c)]).toEqual([0, 0])
})

test('rejected saves log nothing; the log is append-only', async () => {
  const [before] = await f.db.execute(sql`SELECT count(*)::int AS n FROM activity_log`)
  await expect(cmd('PostJournal', 'bad-1', { journalId: crypto.randomUUID(), date: '2038-04-22', lines: [jvLines[0], { ...jvLines[1], amount: '1' }] })).rejects.toThrow('409')
  await expect(call('DELETE', '/sales/customers/NL-T2-C2')).resolves.toBeDefined() // unused: deletable
  const [after] = await f.db.execute(sql`SELECT count(*)::int AS n FROM activity_log`)
  expect(Number(after!.n)).toBe(Number(before!.n) + 2) // the customer delete only: Pelanggan + Kontak
  const fails = (q: PromiseLike<unknown>) => Promise.resolve(q).then(() => false, () => true)
  expect(await fails(f.db.execute(sql`UPDATE activity_log SET reference = 'x'`))).toBe(true)
  expect(await fails(f.db.execute(sql`DELETE FROM activity_log`))).toBe(true)
})

test('login locks after repeated failures; responses carry security headers', async () => {
  const app = createApp(f.db), login = (password: string) => app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'lock@example.test', password }) })
  await createUser(f.db, 'lock@example.test', 'rahasia-123')
  for (let i = 0; i < 10; i++) expect((await login('salah-123')).status).toBe(401)
  const r = await login('rahasia-123')
  expect(r.status).toBe(429)
  expect(r.headers.get('x-content-type-options')).toBe('nosniff')
})
