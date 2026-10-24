import { afterAll, beforeAll, expect, test } from 'bun:test'
import t2 from '../../../docs/reports/fixtures/sales-t2.json'
import t3 from '../../../docs/reports/fixtures/purchase-t3.json'
import t4 from '../../../docs/reports/fixtures/inventory-t4.json'
import { createApp } from '../src/app'
import { createUser } from '../src/auth'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { upsertVendor } from '../src/purchases/service'
import { upsertCustomer, upsertItem } from '../src/sales/service'
import { createFullUser, fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>, app: ReturnType<typeof createApp>, full: string, none: string
beforeAll(async () => {
  f = await fixtureDb('webdocs')
  for (const a of [...t2.accounts, ...t3.accounts, { no: '210102', name: 'Uang Muka Penjualan', type: 'OTHER_CURRENT_LIABILITY' },
    ...t4.accounts.filter(a => ['110401', '510101'].includes(a.no)), { no: '300001', name: 'Ekuitas Saldo Awal', type: 'EQUITY' }].filter(a => !a.no.startsWith('NL-T1')))
    await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const c of t2.customers) await upsertCustomer(f.db, c)
  for (const v of t3.vendors) await upsertVendor(f.db, v)
  for (const i of [...t3.items, t4.items[0]]) await upsertItem(f.db, i as any)
  app = createApp(f.db)
  await createFullUser(f.db, 'nl-docs@example.test', 'rahasia-123')
  await createUser(f.db, 'nl-docs-none@example.test', 'rahasia-123')
  const login = async (email: string) => (await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'rahasia-123' }) })).headers.get('set-cookie')!.split(';')[0]!
  ;[full, none] = [await login('nl-docs@example.test'), await login('nl-docs-none@example.test')]
})
afterAll(() => f.close())

let n = 0
const call = async (method: string, path: string, values?: unknown, cookie = full) => {
  const res = await app.request(`/api/web/docs/${path}`, { method, headers: { cookie, 'content-type': 'application/json' }, body: method === 'GET' ? undefined : JSON.stringify({ idempotencyKey: `web-docs-${++n}`, values }) })
  if (method !== 'GET') await catchUp(f.db, ledgerProjection) // the worker does this in production
  return { status: res.status, body: (await res.json()) as any }
}
const head = { date: '05/04/2033', autoNo: true, number: '', description: 'web' }
const item = { code: 'NL-T2-S1', name: 'NL-T2 Jasa Konsultasi', unit: 'Jam', qty: 2, price: 150_000, discPct: 0 }
const itemDoc = { ...head, party: 'NL-T2 Pelanggan A', items: [item], discPct: 0, taxable: false, inclusive: false, terms: 'Net 30', poNo: '', supplierNo: '', dp: [], invoice: '' }

test('sales invoice, receipt and the paid-invoice delete guard', async () => {
  const si = await call('POST', 'sales-invoice', itemDoc)
  expect(si).toEqual({ status: 201, body: { number: 'SI.2033.04.00001' } })
  let [row] = (await call('GET', 'sales-invoice')).body
  expect(row).toMatchObject({ id: 'SI.2033.04.00001', type: 'sales-invoice', party: 'NL-T2 Pelanggan A', date: '05/04/2033', source: 'Faktur Penjualan', total: 300_000, paid: 0, status: 'unpaid' })
  expect(row.values).toMatchObject({ party: 'NL-T2 Pelanggan A', items: [item], terms: 'Net 30' })
  expect(row.lines).toEqual([{ account: '110301', debit: 300_000, credit: 0, memo: '' }, { account: '400001', debit: 0, credit: 300_000, memo: '' }])

  const pay = { ...head, party: 'NL-T2 Pelanggan A', bank: 'NL-T1-1101 Kas', amount: 100_000, lines: [{ invoice: 'SI.2033.04.00001', date: '05/04/2033', total: 300_000, owing: 300_000, dpp: 300_000, pay: 100_000, discount: 0, pph: false }] }
  const rc = await call('POST', 'sales-receipt', pay)
  expect(rc.status).toBe(201)
  ;[row] = (await call('GET', 'sales-invoice')).body
  expect(row).toMatchObject({ paid: 100_000, status: 'partial' })
  const [r] = (await call('GET', 'sales-receipt')).body
  expect(r.values.lines).toEqual([{ invoice: 'SI.2033.04.00001', date: '05/04/2033', total: 300_000, owing: 300_000, dpp: 300_000, pay: 100_000, discount: 0, pph: false }])

  expect(await call('DELETE', 'sales-invoice/SI.2033.04.00001')).toEqual({ status: 409, body: { error: 'paid', code: 'paid' } })
  expect((await call('PUT', `sales-receipt/${rc.body.number}`, { ...pay, lines: [{ ...pay.lines[0], pay: 300_000 }], amount: 300_000 })).status).toBe(200)
  expect((await call('GET', 'sales-invoice')).body[0].status).toBe('paid')
  expect((await call('DELETE', `sales-receipt/${rc.body.number}`)).status).toBe(200)
  expect((await call('DELETE', 'sales-invoice/SI.2033.04.00001')).status).toBe(200)
  expect((await call('GET', 'sales-invoice')).body).toEqual([])
})

test('Jurnal Umum: create, edit, list with document journals; document journals are edited from the document', async () => {
  const lines = [{ account: '600020', debit: 50_000, credit: 0, memo: 'biaya' }, { account: '110301', debit: 0, credit: 50_000, memo: '' }]
  const jv = await call('POST', 'journal', { ...head, lines })
  expect(jv).toEqual({ status: 201, body: { number: 'JV.2033.04.00001' } })
  await call('POST', 'sales-invoice', itemDoc)
  const rows = (await call('GET', 'journal')).body as any[]
  const mine = rows.find(r => r.no === 'JV.2033.04.00001'), doc = rows.find(r => r.source === 'Faktur Penjualan')
  expect(mine).toMatchObject({ type: 'journal', source: 'Jurnal Umum', total: 50_000, lines })
  expect((await call('PUT', `journal/${mine.id}`, { ...head, description: 'diubah', lines })).status).toBe(200)
  expect((await call('GET', 'journal')).body.find((r: any) => r.id === mine.id).description).toBe('diubah')
  expect((await call('PUT', `journal/${doc.id}`, { ...head, lines })).status).toBe(409)
  expect((await call('DELETE', `journal/${doc.id}`)).status).toBe(409)
  expect((await call('DELETE', `journal/${mine.id}`)).status).toBe(200)
})

test('purchase invoice, stock adjustment gap and quotation edit gap; privileges apply', async () => {
  const pi = await call('POST', 'purchase-invoice', { ...itemDoc, party: 'NL-T3 Pemasok A', supplierNo: 'INV-77' })
  expect(pi.status).toBe(201)
  const [row] = (await call('GET', 'purchase-invoice')).body
  expect(row).toMatchObject({ party: 'NL-T3 Pemasok A', total: 300_000, status: 'unpaid', values: { supplierNo: 'INV-77', items: [{ code: 'NL-T2-S1', qty: 2, price: 150_000 }] } })
  const q = await call('POST', 'sales-quotation', itemDoc)
  expect(q.status).toBe(201)
  expect((await call('GET', 'sales-quotation')).body[0]).toMatchObject({ no: q.body.number, total: 300_000, lines: [] })
  expect((await call('PUT', `sales-quotation/${q.body.number}`, itemDoc)).status).toBe(409)
  expect((await call('POST', 'sales-invoice', { ...itemDoc, inclusive: true })).status).toBe(409)
  // header fields a type cannot store are refused, not dropped
  expect((await call('POST', 'sales-quotation', { ...itemDoc, taxable: true })).status).toBe(409)
  expect((await call('POST', 'purchase-invoice', { ...itemDoc, party: 'NL-T3 Pemasok A', supplierNo: 'INV-78', discPct: 10 })).status).toBe(409)
  expect((await call('POST', 'sales-down-payment', { ...itemDoc, discPct: 5 })).status).toBe(409)
  expect((await call('POST', 'sales-invoice', { ...itemDoc, poNo: 'PO-1' })).status).toBe(409)
  // no discount account on this path, so an invoice discount is refused rather than failing in the service
  expect(await call('POST', 'sales-invoice', { ...itemDoc, discPct: 10 })).toEqual({ status: 409, body: { error: 'Diskon, pajak atau No. PO belum didukung untuk dokumen ini' } })
  // a stock adjustment has no party; the schema must not demand one
  expect((await call('POST', 'stock-adjustment', { ...itemDoc, party: '', items: [{ ...item, code: 'NL-T4-B1', name: 'NL-T4 Barang A', unit: 'PCS' }] })).status).toBe(201)
  expect((await call('GET', 'sales-invoice', undefined, none)).status).toBe(403)
})
