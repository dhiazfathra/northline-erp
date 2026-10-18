import { afterAll, beforeAll, expect, test } from 'bun:test'
import t2 from '../../../docs/reports/fixtures/sales-t2.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import * as R from '../src/reports/receivables'
import { loadSales } from '../src/reports/queries'
import { createSalesInvoice, createSalesReceipt, upsertCustomer, upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('ar')
  for (const a of t2.accounts.filter(a => !a.no.startsWith('NL-T1')))
    await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const c of t2.customers) await upsertCustomer(f.db, c)
  for (const i of t2.items) await upsertItem(f.db, i as any)
  for (const d of t2.documents as any[]) {
    if (d.kind === 'SalesInvoice') await createSalesInvoice(f.db, { idempotencyKey: `t2-${d.ref}`, number: d.number, customer: d.customer, date: d.date, dueDate: d.dueDate, description: d.description, lines: d.lines })
    else await createSalesReceipt(f.db, { idempotencyKey: `t2-${d.ref}`, number: d.number, customer: d.customer, bank: d.bank, date: d.date, description: d.description, payments: d.payments })
  }
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())

const W = { from: '2033-04-01', to: '2033-06-30' }
const TITLES = /^(Daftar Faktur Penjualan|Penjualan per Pelanggan|Penerimaan Penjualan|Buku Besar Pembantu Piutang|Histori Piutang|Pernyataan Piutang|Faktur Belum Lunas)$/
/** Drops page chrome Accurate repeats per page/customer: title, date range, branch line. */
const body = (rows: string[][]) => rows.filter(r => !(r.length === 1 && (TITLES.test(r[0]!) || /^(Dari |Per Tgl\.|Cabang :)/.test(r[0]!))))
const rep = (p: string) => body((t2.reports as any)[p].rows)

const full: [string, (d: R.SalesData) => string[][]][] = [
  ['SalesInvoiceListReport', d => R.salesInvoiceList(d, W.from, W.to)],
  ['ViewSalesByCustomerReport', d => R.salesByCustomer(d, W.from, W.to)],
  ['SalesReceiptListReport', d => R.salesReceiptList(d, W.from, W.to)],
  ['ARLedgerReport', d => R.arLedger(d, W.from, W.to)],
  ['ARHistoryReport', d => R.arHistory(d, W.from, W.to)],
  ['CustomerStatementReport', d => R.customerStatement(d, W.from, W.to)],
]
for (const [p, fn] of full) test(`${p} Apr–Jun 2033`, async () => expect(fn(await loadSales(f.db))).toEqual(rep(p)))

test('OutstandingSalesInvoiceReport per 15 Jul 2033 (NL-T2 blocks)', async () => {
  // sandbox also lists 2026 invoices of other customers; keep the currency line and the NL-T2 customer blocks
  const all = rep('OutstandingSalesInvoiceReport'), out: string[][] = [all[0]!]
  let keep = false
  for (const r of all.slice(1, -1)) { if (r[1] === 'Sisa Kredit') keep = r[0]!.startsWith('NL-T2'); if (keep) out.push(r) }
  const ours = R.outstandingInvoices(await loadSales(f.db), '2033-07-15')
  expect(ours.slice(0, -1)).toEqual(out)
})

test('invoice and receipt journals: types, numbers, merged lines', async () => {
  const { queryGeneralLedger } = await import('../src/reports/queries')
  const h = await queryGeneralLedger(f.db, 'history', { ...W, showZeroBalance: false, showParentAccount: true })
  expect(h.find(r => r[1] === 'SI.2033.04.00003')).toEqual(['Faktur Penjualan', 'SI.2033.04.00003', '110301', 'Piutang Usaha IDR', 'NL-T2 faktur 2', '1.250.000', '0'])
  expect(h.filter(r => r[1] === 'SI.2033.04.00003')).toHaveLength(2) // two item lines → one sales credit
  expect(h.find(r => r[1] === 'NL-T1-1101.2033.05.00001')![0]).toBe('Penerimaan Penjualan')
})

test('overpayment is rejected', async () => {
  await expect(createSalesReceipt(f.db, { idempotencyKey: 't2-overpay-1', customer: 'NL-T2-C1', bank: 'NL-T1-1101', date: '2033-07-01', payments: [{ invoice: 'SI.2033.06.00001', amount: 900000 }] })).rejects.toThrow('melebihi')
})
