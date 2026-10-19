import { afterAll, beforeAll, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { sql } from 'drizzle-orm'
import fx from '../../../docs/reports/fixtures/pph-m50.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseInvoice, createPurchasePayment, upsertVendor } from '../src/purchases/service'
import * as P from '../src/reports/pph'
import { queryGeneralLedger } from '../src/reports/queries'
import { createSalesInvoice, createSalesReceipt, upsertCustomer, upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

// Manufaktur Demo (P3.5): PPh 23 withheld on a purchase payment and a sales receipt (2050); the three built reports and
// the journals toEqual Accurate.
let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('pph')
  for (const a of fx.accounts) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const [i, t] of fx.taxes.entries())
    await f.db.execute(sql`INSERT INTO taxes (name, rate, seq, sales_account, purchase_account, pph_type) VALUES (${t.name}, ${t.rate}, ${i}, ${t.salesAccount}, ${t.purchaseAccount}, ${t.pphType ?? null})`)
  for (const c of fx.customers) await upsertCustomer(f.db, c)
  for (const v of fx.vendors) await upsertVendor(f.db, v)
  for (const i of fx.items) await upsertItem(f.db, i as any)
  for (const d of fx.documents as any[]) {
    const k = { idempotencyKey: `pph-${d.number}`, ...d }
    await ({ PurchaseInvoice: createPurchaseInvoice, SalesInvoice: createSalesInvoice, PurchasePayment: createPurchasePayment, SalesReceipt: createSalesReceipt } as Record<string, (db: any, x: any) => Promise<unknown>>)[d.kind]!(f.db, k)
  }
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())

type Cap = { param: { startDate: string; endDate: string }; rows: string[][] }
const iso = (d: string) => `${d.slice(6, 10)}-${d.slice(3, 5)}-${d.slice(0, 2)}`
const body = (rows: string[][]) => rows.filter(r => !/^(Daftar Bukti Potong PPh (Penjualan|Pembelian)|Pembayaran PPh (Penjualan|Pembelian)|Dari \d|Cabang : |ACCURATE Accounting System Report|Tercetak pada |Halaman )/.test(r[0]!))
const capture = (id: string) => JSON.parse(readFileSync(`${import.meta.dir}/../../../docs/reports/captures/${id}.json`, 'utf8')) as Cap
const R = fx.reports as Record<string, Cap>

test('Daftar Bukti Potong PPh Penjualan: NL-BP50-C1, and the empty default-param capture', async () => {
  const ls = await P.loadPphLines(f.db)
  for (const c of [R.SalesReceiptPPhReport!, capture('SalesReceiptPPhReport')])
    expect(P.salesReceiptPph(ls, iso(c.param.startDate), iso(c.param.endDate))).toEqual(body(c.rows))
})

test('Daftar Bukti Potong PPh Pembelian and Pembayaran PPh Pembelian: NL-BP50-V1', async () => {
  const ls = await P.loadPphLines(f.db), c = R.PurchasePaymentPPhReport!, d = R.PurchaseInvoicePphPaidReport!
  expect(P.purchasePaymentPph(ls, iso(c.param.startDate), iso(c.param.endDate))).toEqual(body(c.rows))
  expect(P.purchaseInvoicePphPaid(ls, iso(d.param.startDate), iso(d.param.endDate))).toEqual(body(d.rows))
})

test('AllJournalReport Jan-Feb 2050: the bank moves the invoice less PPh, PPh to 210202 (payment) / 110505 (receipt)', async () => {
  expect(await queryGeneralLedger(f.db, 'all-journals', { from: '2050-01-01', to: '2050-02-28', showZeroBalance: false, showParentAccount: true })).toEqual(body(R.AllJournalReport!.rows.slice(2)))
})

test('PPh needs a PPh tax with an account, and less than the payment', async () => {
  const base = { vendor: 'NL-T3-V1', bank: 'ZZ-R01-1101', date: '2050-03-01' }
  await createPurchaseInvoice(f.db, { idempotencyKey: 'pph-bad-pi', vendor: 'NL-T3-V1', bill: 'NL-PPH50-BX', date: '2050-03-01', lines: [{ item: 'NL-T2-S1', qty: 1, price: 100000 }] })
  const [inv] = await f.db.execute(sql`SELECT number FROM purchase_invoices WHERE bill_number = 'NL-PPH50-BX'`)
  const pay = (pph: any) => createPurchasePayment(f.db, { idempotencyKey: `pph-bad-${JSON.stringify(pph)}`, ...base, payments: [{ invoice: inv!.number as string, amount: 100000, pph }] })
  await expect(pay({ tax: 'ZZ-R01-PPN 11%', dpp: 100000, rate: 2 })).rejects.toThrow('bukan pajak PPh')
  await expect(pay({ tax: 'Jasa Konsultan', dpp: 5000000, rate: 2 })).rejects.toThrow('melebihi pembayaran')
})

test('HTTP: PPh report route serves the same rows', async () => {
  const { createApp } = await import('../src/app')
  const { createFullUser } = await import('./fixture-db')
  const app = createApp(f.db)
  await createFullUser(f.db, 'nl-pph@example.test', 'rahasia-123')
  const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nl-pph@example.test', password: 'rahasia-123' }) })
  const cookie = login.headers.get('set-cookie')!.split(';')[0]!
  const rows = await (await app.request('/api/reports/tax/sales-receipt-pph?from=2050-01-01&to=2050-12-31', { headers: { cookie } })).json()
  expect(rows).toEqual(body(R.SalesReceiptPPhReport!.rows))
})
