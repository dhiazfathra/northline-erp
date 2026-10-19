import { afterAll, beforeAll, expect, test } from 'bun:test'
import jc from '../../../docs/reports/fixtures/jobcosting-m49.json'
import mx from '../../../docs/reports/fixtures/manufacturing-m49.json'
import { createJobOrder, createMaterialAdjustment, createRollOver } from '../src/inventory/job-costing'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseInvoice, upsertVendor } from '../src/purchases/service'
import * as H from '../src/reports/cogs-manufacture'
import { createSalesInvoice, upsertCustomer, upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

// Manufaktur Demo (P3.3): the NL-JC49 job costing documents (Jan-Feb 2049) plus the NL-PO49 March purchases and sale,
// each month's Pembelian / Penyesuaian Bahan (HPP) toEqual the captured Accurate rows.
let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('hppm')
  for (const a of jc.accounts) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const c of jc.customers) await upsertCustomer(f.db, c)
  for (const v of [...jc.vendors, ...mx.vendors]) await upsertVendor(f.db, v)
  for (const i of jc.items) await upsertItem(f.db, i as any)
  for (const d of [...jc.documents, ...mx.documents] as any[]) {
    const k = { idempotencyKey: `hpp-${d.number}`, ...d }
    if (d.kind === 'PurchaseInvoice') await createPurchaseInvoice(f.db, k)
    else if (d.kind === 'SalesInvoice') await createSalesInvoice(f.db, k)
    else if (d.kind === 'JobOrder') await createJobOrder(f.db, k)
    else if (d.kind === 'MaterialAdjustment') await createMaterialAdjustment(f.db, k)
    else await createRollOver(f.db, k)
  }
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())

type Cap = { param: { periodMonth: string; periodYear: number }; rows: string[][] }
const FURNITURE = /^(ACCURATE Accounting System Report|Tercetak pada |Halaman |Per \S+ \d{4}$|Pembelian \(Harga Pokok Produksi\)$|Penyesuaian Bahan \(Harga Pokok Produksi\)$)/
const body = (rows: string[][]) => rows.filter(r => !FURNITURE.test(r[0]!))
const month = (p: Cap['param']) => {
  const m = p.periodMonth.padStart(2, '0'), last = new Date(Date.UTC(p.periodYear, Number(m), 0)).getUTCDate()
  return [`${p.periodYear}-${m}-01`, `${p.periodYear}-${m}-${last}`] as const
}

for (const [key, c] of Object.entries(mx.reports as Record<string, Cap>)) test(`${key} 2049`, async () => {
  const fn = key.startsWith('Purchase') ? H.purchaseCogsManufacture : H.adjustmentCogsManufacture
  expect(fn(await H.loadCostMoves(f.db, ...month(c.param)))).toEqual(body(c.rows))
})

test('HTTP: Pembelian (HPP) route serves the same rows', async () => {
  const { createApp } = await import('../src/app')
  const { createUser } = await import('../src/auth')
  const app = createApp(f.db)
  await createUser(f.db, 'nl-hpp@example.test', 'rahasia-123')
  const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nl-hpp@example.test', password: 'rahasia-123' }) })
  const cookie = login.headers.get('set-cookie')!.split(';')[0]!
  const rows = await (await app.request('/api/reports/manufacturing/purchase-cogs?from=2049-03-01&to=2049-03-31', { headers: { cookie } })).json()
  expect(rows).toEqual(body((mx.reports as Record<string, Cap>)['PurchaseCOGSManufactureReport-3']!.rows))
})
