import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import fx from '../../../docs/reports/fixtures/trade/trade-tp.json'
import jfx from '../../../docs/reports/fixtures/trade/journal-tp.json'
import { connect, migrate } from '../src/db'
import { setCostingMethod } from '../src/inventory/fifo'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseInvoice, upsertVendor } from '../src/purchases/service'
import * as I from '../src/reports/inventory'
import * as P from '../src/reports/payables'
import { loadInventory, loadPurchases, loadSales } from '../src/reports/queries'
import * as R from '../src/reports/receivables'
import * as T from '../src/reports/tax'
import { createSalesInvoice, upsertCustomer, upsertItem } from '../src/sales/service'

// Trade Portal Demo (ADR-0029): NL-TP purchases and sale of March 2045 replayed on Trade Portal's chart of accounts.
// Company costing method AVERAGE (ADR-0031), so cost-dependent reports match too.
const url = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:northline@localhost:55432/northline'
const schema = `tradetp_${process.pid}`
const { client, db } = connect(`${url}?options=-c%20search_path%3D${schema}`)

beforeAll(async () => {
  await client.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema}`)
  await migrate(client)
  const depth = (no: string | null): number => (no ? 1 + depth(fx.accounts.find(a => a.no === no)!.parentNo) : 0)
  for (const a of [...fx.accounts].sort((x, y) => depth(x.parentNo) - depth(y.parentNo)))
    await handle(db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any, parentNo: a.parentNo ?? undefined })
  await catchUp(db, ledgerProjection)
  await db.execute(sql`INSERT INTO ledger_settings (retained_earnings_account, fiscal_year_start_month) VALUES ('300002', 1)`)
  await db.transaction(tx => setCostingMethod(tx, 'AVERAGE')) // Trade Portal costs by moving average (ADR-0031)
  for (const [i, t] of (fx as any).taxes.entries())
    await db.execute(sql`INSERT INTO taxes (name, rate, seq, sales_account, purchase_account) VALUES (${t.name}, ${t.rate}, ${i}, ${t.salesAccount}, ${t.purchaseAccount})`)
  // the demo's opening (journal OB) and NL-TP J1-J4 of Jan-Feb 2045: same Data Usaha, so the March documents sit on the real balances
  for (const j of jfx.journals)
    await handle(db, { type: 'PostJournal', idempotencyKey: `nl-tp-${j.ref}`, journalId: crypto.randomUUID(), date: j.date, description: j.description,
      lines: j.lines.map(l => ({ ...l, side: l.side as 'DEBIT' | 'CREDIT' })) })
  for (const c of fx.customers) await upsertCustomer(db, c)
  for (const v of fx.vendors) await upsertVendor(db, v)
  for (const i of fx.items) await upsertItem(db, i as any)
  for (const d of fx.documents as any[]) {
    if (d.kind === 'PurchaseInvoice') await createPurchaseInvoice(db, { idempotencyKey: `tp-${d.ref}`, number: d.number, vendor: d.vendor, bill: d.bill, date: d.date, dueDate: d.dueDate, description: d.description, lines: d.lines })
    else await createSalesInvoice(db, { idempotencyKey: `tp-${d.ref}`, number: d.number, customer: d.customer, date: d.date, dueDate: d.dueDate, description: d.description, lines: d.lines })
  }
  await catchUp(db, ledgerProjection)
})
afterAll(async () => { await client.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await client.end() })

// Older HTML captures kept `&gt;`; Trade Portal's arrive decoded. Compare decoded text.
const dec = (rows: string[][]) => rows.map(r => r.map(c => c.replace(/&gt;/g, '>')))
const W = { from: '2045-03-01', to: '2045-03-31' }, AS_OF = '2045-04-30'
/** Page furniture out: company line, title, date range, branch line, footer. */
const rep = (p: string) => {
  const rows = (fx.reports as any)[p].rows as string[][], title = rows[1]![0]
  return rows.filter(r => !(/^(ACCURATE Accounting|Tercetak pada|Halaman )/.test(r[0]!) || (r.length === 1 && (r[0] === rows[0]![0] || r[0] === title || /^(Dari |Per Tgl\.|Cabang :)/.test(r[0]!)))))
}

const sales: [string, (d: R.SalesData) => string[][]][] = [
  ['ViewSalesByItemReport', d => R.salesByItem(d, W.from, W.to)],
  ['SalesInvoiceListReport', d => R.salesInvoiceList(d, W.from, W.to)],
  ['ViewSalesByCustomerReport', d => R.salesByCustomer(d, W.from, W.to)],
  ['AgingReceivableReport', d => R.agingReceivable(d, AS_OF, 'INVOICE_DATE')],
  ['OutstandingSalesInvoicePerCustomerReport', d => R.outstandingPerCustomer(d, AS_OF)],
]
for (const [p, fn] of sales) test(`${p} (Trade Portal, March 2045)`, async () => expect(dec(fn(await loadSales(db)))).toEqual(rep(p)))

const purchases: [string, (d: any) => string[][]][] = [
  ['PurchaseByItemReport', d => P.purchaseByItem(d, W.from, W.to)],
  ['PurchaseInvoiceListReport', d => R.salesInvoiceList(d, W.from, W.to)],
  ['AgingPayableReport', d => P.agingPayable(d, AS_OF, 'INVOICE_DATE')],
  ['OutstandingPurchaseInvoicePerVendorReport', d => P.outstandingPerVendor(d, AS_OF)],
]
for (const [p, fn] of purchases) test(`${p} (Trade Portal, March 2045)`, async () => expect(dec(fn(await loadPurchases(db)))).toEqual(rep(p)))

test('InventoryStockCardReport NL-TP-B1 (quantities only, cost-independent)', async () =>
  expect(I.stockCard(await loadInventory(db), ['NL-TP-B1'], W.from, W.to)).toEqual(rep('InventoryStockCardReport')))

test('ProfitabilityByItemReport (AVERAGE: HPP 1.650.000, FIFO would give 1.600.000)', async () => {
  const s = (await db.execute(sql`SELECT l.item_no, to_char(i.date,'YYYY-MM-DD') AS date, l.total FROM sales_invoice_lines l JOIN sales_invoices i ON i.number = l.invoice_number`))
    .map(r => ({ item: r.item_no as string, date: r.date as string, total: Number(r.total) }))
  expect(I.profitabilityByItem(await loadInventory(db), s, W.from, W.to)).toEqual(rep('ProfitabilityByItemReport'))
})

test('InventoryValuationReport and InventoryValuationDetailReport NL-TP-B1 under AVERAGE', async () => {
  const d = await loadInventory(db)
  // the demo's 35 opening items are carried as journal OB only, so compare the NL-TP-B1 row
  const row = (rows: string[][]) => rows.find(r => r[1] === 'NL-TP-B1')
  expect(row(I.inventoryValuation(d, W.from, W.to))).toEqual(row(rep('InventoryValuationReport')))
  expect(I.valuationDetail(d, ['NL-TP-B1'], W.from, W.to)).toEqual(rep('InventoryValuationDetailReport'))
})

// NL-TP-P3/S2 (May 2045): 1 @ 100.000 onto 5 @ 110.000 gives 108.333,33; selling 3 costs 325.000, so Accurate rounds per line
test('InventoryValuationDetailReport Mar-May 2045: average rounded per line, not per unit', async () =>
  expect(I.valuationDetail(await loadInventory(db), ['NL-TP-B1'], '2045-03-01', '2045-05-31')).toEqual(rep('InventoryValuationDetailReport:rounding')))

test('setCostingMethod refuses once stock moves exist', async () =>
  expect(db.transaction(tx => setCostingMethod(tx, 'FIFO'))).rejects.toThrow('tidak dapat diubah'))

test('TaxationOutReport 1 Jan - 31 Mar 2045: sections per tax sales account, PPnBM on Persediaan ', async () => {
  const e = (fx as any).ledgerQ1.TaxationOutReport.rows as string[][]
  const want = e.filter(r => !(/^(ACCURATE Accounting|Tercetak pada|Halaman )/.test(r[0]!) || (r.length === 1 && r[0] === e[0]![0])))
  const ours = T.taxationListBySection(await T.loadTaxLines(db), 'OUT', '2045-01-01', '2045-03-31', await T.loadTaxSections(db, 'OUT', '2045-01-01'))
  expect(ours).toEqual(want)
})

// Daftar PPN Masukan / Keluaran and Rekonsiliasi PPN over four windows (tax sections per account, ADR-0029 finding 10).
const TW: Record<string, [string, string]> = { q1: ['2045-01-01', '2045-03-31'], mar: ['2045-03-01', '2045-03-31'], apr: ['2045-04-01', '2045-04-30'], q1apr: ['2045-01-01', '2045-04-30'] }
for (const [planId, side] of [['TaxationInReport', 'IN'], ['TaxationOutReport', 'OUT'], ['TaxationInOutReport', 'BOTH']] as const)
  for (const [w, [from, to]] of Object.entries(TW))
    test(`${planId} ${w} (Trade Portal)`, async () => {
      const e = (fx as any).tax[`${planId}:${w}`].rows as string[][]
      // page furniture out; title, period line and column header repeat on every page: keep the first of each
      const once = new Set([e[1]![0], e[2]![0], 'Tanggal'].map(String)), kept = new Set<string>()
      const want = e.filter(r => {
        if (/^(ACCURATE Accounting|Tercetak pada|Halaman )/.test(r[0]!) || (r.length === 1 && r[0] === e[0]![0])) return false
        if (!once.has(r[0]!)) return true
        if (kept.has(r[0]!)) return false
        kept.add(r[0]!); return true
      })
      const lines = await T.loadTaxLines(db)
      const ours = side === 'BOTH'
        ? T.taxationInOutBySection(lines, from, to, { IN: await T.loadTaxSections(db, 'IN', from), OUT: await T.loadTaxSections(db, 'OUT', from) })
        : T.taxationListBySection(lines, side, from, to, await T.loadTaxSections(db, side, from))
      expect(ours).toEqual(want)
    })
