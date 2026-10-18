import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import t19 from '../../../docs/reports/fixtures/tax-t19.json'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseInvoice, reportSptMasa, upsertVendor } from '../src/purchases/service'
import { queryGeneralLedger } from '../src/reports/queries'
import * as T from '../src/reports/tax'
import { createSalesInvoice, createSalesReceipt, upsertCustomer, upsertItem } from '../src/sales/service'
import { fixtureDb } from './fixture-db'

let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('tax')
  for (const a of t19.accounts)
    await handle(f.db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(f.db, ledgerProjection)
  for (const [i, t] of t19.taxes.entries())
    await f.db.execute(sql`INSERT INTO taxes (name, rate, seq, sales_account, purchase_account) VALUES (${t.name}, ${t.rate}, ${i}, ${t.salesAccount}, ${t.purchaseAccount})`)
  for (const c of t19.customers) await upsertCustomer(f.db, c)
  for (const v of t19.vendors) await upsertVendor(f.db, v)
  for (const i of t19.items) await upsertItem(f.db, i as any)
  for (const d of t19.documents as any[])
    if (d.kind === 'SalesInvoice')
      await createSalesInvoice(f.db, { idempotencyKey: `t19-${d.ref}`, number: d.number, customer: d.customer, date: d.date, description: d.description,
        taxable: d.taxable, taxNumber: d.taxNumber, discPct: d.discPct ?? 0, discountAccount: t19.invoiceDiscountAccount, lines: d.lines })
    else if (d.kind === 'SalesReceipt') await createSalesReceipt(f.db, { idempotencyKey: `t19-${d.ref}`, number: d.number, customer: d.customer, bank: d.bank, date: d.date, description: d.description, amount: d.amount, cheque: d.cheque, payments: d.payments })
    else await createPurchaseInvoice(f.db, { idempotencyKey: `t19-${d.ref}`, number: d.number, vendor: d.vendor, bill: d.bill, date: d.date, description: d.description, taxable: d.taxable, lines: d.lines })
  for (const s of t19.sptMasa) await reportSptMasa(f.db, s.from, s.to)
  await catchUp(f.db, ledgerProjection)
})
afterAll(() => f.close())

const W = { from: '2035-11-01', to: '2035-11-30' }
// The sandbox demo invoices (Oct 2026) carry PPN Keluaran 628.100 and PPN Masukan 220.000 that Accurate opens with;
// added as one line per side so whole reports diff.
const DEMO: T.TaxLine[] = [
  { side: 'OUT', number: 'demo', date: '2026-10-04', taxDate: '2026-10-04', taxNumber: '', tax: 'ZZ-R01-PPN 11%', rate: 11, amount: 62_810_000 },
  { side: 'IN', number: 'demo', date: '2026-10-04', taxDate: '2026-10-04', taxNumber: '', tax: 'ZZ-R01-PPN 11%', rate: 11, amount: 22_000_000 },
]
const R = t19.reports
const lines = async () => [...DEMO, ...await T.loadTaxLines(f.db)]

test('TaxationOutReport Nov 2035', async () => expect(T.taxationOut(await lines(), W.from, W.to)).toEqual(R.TaxationOutReport.rows))
test('TaxationInReport Nov 2035', async () => expect(T.taxationIn(await lines(), W.from, W.to)).toEqual(R.TaxationInReport.rows))
test('TaxationInOutReport Nov 2035: Keluaran − Masukan', async () => expect(T.taxationInOut(await lines(), W.from, W.to)).toEqual(R.TaxationInOutReport.rows))
test('SPT Masa PPN lists Nov 2035: reported invoices by transaction type and document code', async () => {
  expect(T.salesInvoiceSpt(await lines(), W.from, W.to)).toEqual(R.SalesInvoiceSPTListReport.rows)
  expect(T.purchaseInvoiceSpt(await lines(), W.from, W.to)).toEqual(R.PurchaseInvoiceSPTListReport.rows)
})
test('AllJournalReport Nov 2035: taxed invoices post discounts, PPN and gross sales/expense', async () => {
  // title + date range are page chrome in the GL query's output
  expect(await queryGeneralLedger(f.db, 'all-journals', { from: W.from, to: W.to, showZeroBalance: false, showParentAccount: true })).toEqual(R.AllJournalReport.rows.slice(2))
})

test('sales item views Nov 2035: Penjualan is the DPP (after line and invoice discounts, without PPN)', async () => {
  const fx = (await import('../../../docs/reports/fixtures/sales-views.json')).default
  const R = await import('../src/reports/receivables'), { loadSales } = await import('../src/reports/queries'), d = await loadSales(f.db)
  const fns = { ViewSalesItemByWarehouseReport: R.salesItemByWarehouse, ViewSalesItemByBranchReport: R.salesItemByBranch, ViewSalesByBrandReport: R.salesByBrand }
  for (const [id, fn] of Object.entries(fns)) for (const w of (fx as any)[id].filter((w: any) => w.from === W.from)) expect(fn(d, w.from, w.to)).toEqual(w.rows)
})

test('CustomerLimitReport: customers with a limit, saldo per currency, sisa = limit - saldo', async () => {
  const R = await import('../src/reports/receivables'), Q = await import('../src/reports/queries')
  const fx = t19.reports.CustomerLimitReport, giro = new Map<string, number>()
  for (const c of await Q.loadCheques(f.db)) if (c.chequeDate > fx.today) giro.set(c.customer, (giro.get(c.customer) ?? 0) + c.amount)
  expect(R.customerLimit(await Q.loadSales(f.db), await Q.loadCreditLimits(f.db), fx.currencies, giro)).toEqual(fx.rows)
})

test('CustomerExistingCreditListReport: an overpaying receipt leaves the excess as customer credit', async () => {
  const R = await import('../src/reports/receivables'), Q = await import('../src/reports/queries'), d = await Q.loadSales(f.db)
  for (const c of t19.reports.CustomerExistingCreditListReport) expect(R.customerCredit(d, c.asOf)).toEqual(c.rows)
})

test('OutstandingChequeReport: cheques listed until their cheque date', async () => {
  const C = await import('../src/reports/cash-bank'), Q = await import('../src/reports/queries'), cs = await Q.loadCheques(f.db)
  for (const c of t19.reports.OutstandingChequeReport) expect(C.outstandingCheques(cs, c.banks, c.asOf)).toEqual(c.rows)
})

test('AllJournalReport Dec 2035: a cheque receipt is journaled on its cheque date', async () => {
  expect(await queryGeneralLedger(f.db, 'all-journals', { from: '2035-12-01', to: '2035-12-31', showZeroBalance: false, showParentAccount: true })).toEqual(R.AllJournalReportDec.rows.slice(2))
})
