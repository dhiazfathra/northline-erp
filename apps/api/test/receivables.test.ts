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
/** Drops page chrome Accurate repeats per page/customer: the report's own title, date range, branch line. */
const body = (rows: string[][]) => rows.filter(r => !(r.length === 1 && (r[0] === rows[0]![0] || /^(Dari |Per Tgl\.|Cabang :)/.test(r[0]!))))
const rep = (p: string) => body((t2.reports as any)[p].rows)

const full: [string, (d: R.SalesData) => string[][]][] = [
  ['SalesInvoiceListReport', d => R.salesInvoiceList(d, W.from, W.to)],
  ['ViewSalesByCustomerReport', d => R.salesByCustomer(d, W.from, W.to)],
  ['SalesReceiptListReport', d => R.salesReceiptList(d, W.from, W.to)],
  ['ARLedgerReport', d => R.arLedger(d, W.from, W.to)],
  ['ARHistoryReport', d => R.arHistory(d, W.from, W.to)],
  ['CustomerStatementReport', d => R.customerStatement(d, W.from, W.to)],
  ['ARLedgerDetailReport', d => R.arLedgerDetail(d, W.from, W.to)],
  ['SalesInvoicePaidReport', d => R.salesInvoicePaid(d, W.from, W.to)],
  ['SalesReceiptListDetailReport', d => R.salesReceiptDetail(d, W.from, W.to)],
  ['OwingCollectionPerCustomerReport', d => R.owingCollection(d, W.from, W.to)],
  ['ViewSalesByItemReport', d => R.salesByItem(d, W.from, W.to)],
  ['ViewSalesItemByCustomerReport', d => R.salesItemByCustomer(d, W.from, W.to)],
  ['ViewSalesCustomerByItemReport', d => R.salesCustomerByItem(d, W.from, W.to)],
  ['ViewSalesByCustomerDetailReport', d => R.salesByCustomerDetail(d, W.from, W.to)],
  ['ViewSalesByItemDetailReport', d => R.salesByItemDetail(d, W.from, W.to)],
  ['ViewSalesByBranchReport', d => R.salesByBranch(d, W.from, W.to)],
  ['SalesInvoiceDetailReport', d => R.salesInvoiceDetail(d, W.from, W.to)],
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

test('AgingReceivableReport per 15 Jul 2033 (header + NL-T2 row)', async () => {
  const e = rep('AgingReceivableReport'), ours = R.agingReceivable(await loadSales(f.db), '2033-07-15')
  expect(ours.slice(0, 2)).toEqual(e.slice(0, 2))
})

test('AgingReceivableDetailReport per 15 Jul 2033 (NL-T2 block)', async () => {
  const e = rep('AgingReceivableDetailReport')
  const second = e.findIndex((r, i) => i > 1 && r[1] === 'Sisa Kredit')
  const ours = R.agingReceivableDetail(await loadSales(f.db), '2033-07-15')
  expect(ours).toEqual(e.slice(0, second))
})

test('OutstandingSalesInvoicePerCustomerReport per 15 Jul 2033 (header + NL-T2 row)', async () => {
  expect(R.outstandingPerCustomer(await loadSales(f.db), '2033-07-15').slice(0, 2)).toEqual(rep('OutstandingSalesInvoicePerCustomerReport').slice(0, 2))
})

test('CustomerListReport per 15 Jul 2033 (NL-T2 rows; creation timestamps are Accurate wall-clock, passed through)', async () => {
  const e = rep('CustomerListReport'), created = new Map(e.filter(r => /^NL-T2/.test(r[0]!)).map(r => [r[0]!, r[2]!]))
  expect(R.partyList(await loadSales(f.db), '2033-07-15', created)).toEqual(e.filter(r => /^(ID |Umum$|NL-T2)/.test(r[0]!)))
})

test('SalesFlowHistoryReport, SellingItemFrequencyReport, ProfitabilityBySalesInvoiceReport', async () => {
  const d = await loadSales(f.db)
  expect(R.flowHistory(d, W.from, W.to, true)).toEqual(rep('SalesFlowHistoryReport'))
  expect(R.sellingItemFrequency(d, W.from, W.to)).toEqual(rep('SellingItemFrequencyReport'))
  expect(R.profitabilityByInvoice(d, W.from, W.to)).toEqual(rep('ProfitabilityBySalesInvoiceReport'))
})

test('Grafik Umur Piutang and Rata-rata Pembayaran (series transcribed from Accurate PNGs)', async () => {
  const ch = (await import('../../../docs/reports/fixtures/charts.json')).default
  const d = await loadSales(f.db)
  // the "> 120" bar is the sandbox's own 2026 receivables, absent from the fixture ledger
  expect(R.agingChart(d, '2033-07-15') as string[][]).toEqual(ch.AgingReceivableChartReport.bars.filter(b => b[0] !== '&gt; 120'))
  expect(R.collectionDaysChart(d, '2033-04-01', '2033-06-30') as string[][]).toEqual(ch.OwingCollectionGraphReport.bars)
})
