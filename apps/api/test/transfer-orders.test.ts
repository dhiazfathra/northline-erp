import { afterAll, beforeAll, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import tx from '../../../docs/reports/fixtures/transfer-orders-m49.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseInvoice, upsertVendor } from '../src/purchases/service'
import { createTransferOrder } from '../src/purchases/transfer-orders'
import * as T from '../src/reports/transfer-orders'
import { upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

// Manufaktur Demo (P3.2): TFO.2049.03.00001 pays PI.2049.03.00002 by bank transfer; Daftar Perintah Pembayaran toEqual Accurate.
let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('tfom')
  for (const a of tx.accounts) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const v of tx.vendors) await upsertVendor(f.db, v)
  for (const i of tx.items) await upsertItem(f.db, i as any)
  for (const d of tx.documents as any[]) {
    const k = { idempotencyKey: `tfo-${d.number}`, ...d }
    if (d.kind === 'PurchaseInvoice') await createPurchaseInvoice(f.db, k)
    else await createTransferOrder(f.db, k)
  }
})
afterAll(() => f.close())

type Cap = { param: { startDate: string; endDate: string }; rows: string[][] }
const iso = (d: string) => `${d.slice(6, 10)}-${d.slice(3, 5)}-${d.slice(0, 2)}`
const body = (rows: string[][]) => rows.filter(r => !/^(Daftar Perintah Pembayaran$|Dari \d|Cabang : |ACCURATE Accounting System Report|Tercetak pada |Halaman )/.test(r[0]!))

test('Daftar Perintah Pembayaran: NL-PO49 2049, and the empty default-param capture', async () => {
  const orders = await T.loadTransferOrders(f.db)
  for (const c of [tx.reports.TransferOrderListReport as Cap, JSON.parse(readFileSync(`${import.meta.dir}/../../../docs/reports/captures/TransferOrderListReport.json`, 'utf8')) as Cap])
    expect(T.transferOrderList(orders, iso(c.param.startDate), iso(c.param.endDate))).toEqual(body(c.rows))
})

test('a payment order needs invoices, a cash/bank account, the vendor bank, and no more than the owing', async () => {
  const base = { date: '2049-03-16', dueDate: '2049-03-20', bank: '110102' }
  await expect(createTransferOrder(f.db, { idempotencyKey: 'tfo-bad-1', ...base, lines: [] })).rejects.toThrow('Faktur harus diisi')
  await expect(createTransferOrder(f.db, { idempotencyKey: 'tfo-bad-2', ...base, bank: '210101', lines: [{ invoice: 'PI.2049.03.00002', amount: 1, vendorBank: 'BCA 1' }] })).rejects.toThrow('bukan akun Kas & Bank')
  await expect(createTransferOrder(f.db, { idempotencyKey: 'tfo-bad-3', ...base, lines: [{ invoice: 'PI.2049.03.00002', amount: 1 }] })).rejects.toThrow('Rekening Bank')
  await expect(createTransferOrder(f.db, { idempotencyKey: 'tfo-bad-4', ...base, lines: [{ invoice: 'PI.2049.03.00002', amount: 30_001, vendorBank: 'BCA 1' }] })).rejects.toThrow('melebihi sisa utang')
})

test('HTTP: transfer order list route serves the same rows', async () => {
  const { createApp } = await import('../src/app')
  const { createUser } = await import('../src/auth')
  const app = createApp(f.db)
  await createUser(f.db, 'nl-tfo@example.test', 'rahasia-123')
  const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nl-tfo@example.test', password: 'rahasia-123' }) })
  const cookie = login.headers.get('set-cookie')!.split(';')[0]!
  const rows = await (await app.request('/api/reports/purchases/transfer-order-list?from=2049-01-01&to=2049-12-31', { headers: { cookie } })).json()
  expect(rows).toEqual(body(tx.reports.TransferOrderListReport.rows))
})
