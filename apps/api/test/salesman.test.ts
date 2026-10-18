import { afterAll, beforeAll, expect, test } from 'bun:test'
import rc from '../../../docs/reports/fixtures/retail/salesman-rc.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import * as R from '../src/reports/salesman'
import { saveSalesTarget } from '../src/reports/targets'
import { createSalesReturn } from '../src/returns/service'
import { createSalesInvoice, createSalesReceipt, upsertCustomer, upsertItem } from '../src/sales/service'
import { saveCommission, upsertSalesman } from '../src/sales/salesmen'
import { fixtureDb } from './fixture-db'

// Retail Demo, NL-RC documents (fixtures/retail/salesman-rc.json, ADR-0023). The sandbox's own 2016-17 receivables of
// salesmen Adam / Jhonni Haris show up in the as-of reports: only NL-RC salesman blocks are compared there.
let f: Awaited<ReturnType<typeof fixtureDb>>, d: R.SalesmanData
beforeAll(async () => {
  f = await fixtureDb('sm')
  for (const a of rc.accounts) await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const s of rc.salesmen) await upsertSalesman(f.db, s)
  for (const c of rc.customers) await upsertCustomer(f.db, c)
  for (const i of rc.items) await upsertItem(f.db, i as any)
  for (const c of rc.commissions) await saveCommission(f.db, c)
  for (const t of rc.targets) await saveSalesTarget(f.db, t as any)
  for (const x of rc.documents as any[]) {
    const key = `salesman-rc-${x.ref}`
    if (x.kind === 'SalesInvoice') await createSalesInvoice(f.db, { idempotencyKey: key, number: x.number, customer: x.customer, date: x.date, dueDate: x.dueDate, description: x.description, lines: x.lines, rate: x.rate ?? 1 })
    else if (x.kind === 'SalesReturn') await createSalesReturn(f.db, { idempotencyKey: key, number: x.number, invoice: x.invoice, date: x.date, description: x.description, lines: x.lines })
    else await createSalesReceipt(f.db, { idempotencyKey: key, number: x.number, customer: x.customer, bank: x.bank, date: x.date, description: x.description, payments: x.payments })
  }
  await catchUp(f.db, ledgerProjection)
  d = await R.loadSalesmanData(f.db)
})
afterAll(() => f.close())

/** Drops page chrome: title, period/branch lines, footer, and the column header Accurate repeats after a page break. */
function body(rows: string[][]) {
  const out = rows.filter(r => !(r.length === 1 && (r[0] === rows[0]![0] || /^(Dari |Per |per \d{4}$|Cabang :|ACCURATE Accounting|Tercetak pada)/.test(r[0]!))) && !/^Halaman /.test(r[0]!))
  const head = out.find(r => r.length > 1)
  return out.filter((r, i) => i === out.indexOf(head!) || r.join('|') !== head!.join('|'))
}
const rep = (p: string, v?: number) => { const r = (rc.reports as any)[p]; return body((v === undefined ? r : r.variants[v]).rows) }
const CURRENCIES = new Set(['Indonesian Rupiah', 'US Dollar', 'Singapore Dollar'])
/** Keeps NL-RC salesman blocks (name line .. subtotal) and the currency headings above them. */
function ours(rows: string[][]) {
  const out: string[][] = [rows[0]!]
  let heading: string[] | null = null, keep = false
  for (const r of rows.slice(1)) {
    if (r.length === 1 && CURRENCIES.has(r[0]!)) { heading = r; keep = false; continue }
    if (r.length === 1 && !/^[\d,.-]+$/.test(r[0]!)) { keep = r[0]!.startsWith('NL-RC'); if (keep && heading) { out.push(heading); heading = null } }
    if (keep) out.push(r)
  }
  return out
}
/** Summary aging: currency code dropped from the first row of each block, NL-RC rows only. */
const agingRows = (rows: string[][]) => rows.map(r => (/^[A-Z]{3}$/.test(r[0]!) ? r.slice(1) : r)).filter((r, i) => i === 0 || r[0]!.startsWith('NL-RC'))

test('AgingReceivablePerSalesmanReport per 31 Jul and 20 Jul 2043 (NL-RC rows)', () => {
  expect(agingRows(R.agingPerSalesman(d, '2043-07-31'))).toEqual(agingRows(rep('AgingReceivablePerSalesmanReport')))
  expect(agingRows(R.agingPerSalesman(d, '2043-07-20'))).toEqual(agingRows(rep('AgingReceivablePerSalesmanReport', 0)))
  // the USD invoice sits in its own currency block, in USD
  expect(R.agingPerSalesman(d, '2043-07-31')).toContainEqual(['USD', 'NL-RC Sales B', '1,000', '0', '0', '0', '0', '1,000'])
})
test('AgingReceivableDetailPerSalesmanReport per 31 Jul and 20 Jul 2043 (NL-RC blocks)', () => {
  expect(R.agingDetailPerSalesman(d, '2043-07-31')).toEqual(ours(rep('AgingReceivableDetailPerSalesmanReport')))
  expect(R.agingDetailPerSalesman(d, '2043-07-20')).toEqual(ours(rep('AgingReceivableDetailPerSalesmanReport', 0)))
})
test('OutstandingInvoicePerSalesmanReport per 31 Jul and 20 Jul 2043 (NL-RC blocks)', () => {
  expect(R.outstandingPerSalesman(d, '2043-07-31')).toEqual(ours(rep('OutstandingInvoicePerSalesmanReport')))
  expect(R.outstandingPerSalesman(d, '2043-07-20')).toEqual(ours(rep('OutstandingInvoicePerSalesmanReport', 0)))
})
const Y = ['2043-01-01', '2043-12-31'] as const
test('SalesInvoiceListBySalesmanReport 2043', () => expect(R.invoiceListBySalesman(d, ...Y)).toEqual(rep('SalesInvoiceListBySalesmanReport')))
test('SalesReturnListBySalesmanReport 2043', () => expect(R.returnListBySalesman(d, ...Y)).toEqual(rep('SalesReturnListBySalesmanReport')))
test('TransactionPerSalesmanListReport 2043', () => expect(R.transactionsPerSalesman(d, ...Y)).toEqual(rep('TransactionPerSalesmanListReport')))
test('SalesSalesmanByItemReport 2043, both salesmen selected', () => expect(R.salesBySalesmanItem(d, ...Y, ['NL-RC-E1', 'NL-RC-E2'])).toEqual(rep('SalesSalesmanByItemReport')))
test('SalesmanSalesTargetReport 2043', () => expect(R.salesmanTargets(d, 2043)).toEqual(rep('SalesmanSalesTargetReport')))
test('SalesmanCommissionByInvoiceDetailReport 2043 and March 2043', () => {
  expect(R.commissionByInvoiceDetail(d, ...Y)).toEqual(rep('SalesmanCommissionByInvoiceDetailReport'))
  expect(R.commissionByInvoiceDetail(d, '2043-03-01', '2043-03-31')).toEqual(rep('SalesmanCommissionByInvoiceDetailReport', 0))
})
test('SalesmanCommissionByInvoiceSummaryReport 2043', () => expect(R.commissionByInvoiceSummary(d, ...Y)).toEqual(rep('SalesmanCommissionByInvoiceSummaryReport')))
test('SalesmanCommissionByPeriodDetailReport Feb and Mar 2043', () => {
  expect(R.commissionByPeriodDetail(d, 2043, 2)).toEqual(rep('SalesmanCommissionByPeriodDetailReport'))
  expect(R.commissionByPeriodDetail(d, 2043, 3)).toEqual(rep('SalesmanCommissionByPeriodDetailReport', 0))
})
test('SalesmanCommissionByPeriodSummaryReport Feb and Mar 2043', () => {
  expect(R.commissionByPeriodSummary(d, 2043, 2)).toEqual(rep('SalesmanCommissionByPeriodSummaryReport'))
  expect(R.commissionByPeriodSummary(d, 2043, 3)).toEqual(rep('SalesmanCommissionByPeriodSummaryReport', 0))
})
test('SalesmanCommissionListReport', () => expect(R.commissionList(d)).toEqual(rep('SalesmanCommissionListReport')))
test('SalesCheckInPerSalesmanReport 2043 (no check-ins: layout only)', () => expect(R.checkInsPerSalesman(d, ...Y)).toEqual(rep('SalesCheckInPerSalesmanReport')))
