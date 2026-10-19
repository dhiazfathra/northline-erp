import { afterAll, beforeAll, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import fx from '../../../docs/reports/fixtures/trade/trade-tp.json'
import jfx from '../../../docs/reports/fixtures/trade/journal-tp.json'
import { connect, migrate } from '../src/db'
import { setCostingMethod } from '../src/inventory/fifo'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'
import { createPurchaseInvoice, upsertVendor } from '../src/purchases/service'
import * as F from '../src/reports/financial-statements'
import * as I from '../src/reports/inventory'
import * as P from '../src/reports/payables'
import { loadInventory, loadPurchases, loadSales } from '../src/reports/queries'
import * as R from '../src/reports/receivables'
import * as T from '../src/reports/tax'
import { createPurchaseReturn, createSalesReturn } from '../src/returns/service'
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
    else if (d.kind === 'SalesReturn' || d.kind === 'PurchaseReturn') await (d.kind === 'SalesReturn' ? createSalesReturn : createPurchaseReturn)(db, { idempotencyKey: `tp-${d.ref}`, number: d.number, invoice: d.invoice, date: d.date, description: d.description, lines: d.lines })
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

// May 2045 probes. NL-TP-P3/S2: 1 @ 100.000 onto 5 @ 110.000 gives 108.333,33; selling 3 costs 325.000 (rounded per line,
// per unit would be 324.999). NL-TP-P4 1 @ 130.000, then NL-TP-SR1 returns 1 at the invoice's cost 108.333,33 (not the
// average 113.750 or the last purchase 130.000); NL-TP-PR1 returns the 130.000 purchase out at the average 112.666,67.
test('InventoryValuationDetailReport Mar-May 2045: rounding per line, returns under AVERAGE', async () =>
  expect(I.valuationDetail(await loadInventory(db), ['NL-TP-B1'], '2045-03-01', '2045-05-31')).toEqual(rep('InventoryValuationDetailReport:may')))

test('Laba/Rugi (Standar) May 2045: HPP 325.000 - SRT 108.333,33 - PRT difference 17.333,33 (0,01 ledger-precision gap pinned)', async () => {
  const accounts = fx.accounts.map(a => ({ no: a.no, name: a.name, type: a.type as any, parentNo: a.parentNo }))
  const balances = (await db.execute(sql`SELECT account_no, to_char(date,'YYYY-MM-DD') AS date, debit, credit FROM account_daily_balances`))
    .map(r => ({ account: r.account_no as string, date: r.date as string, debit: Number(r.debit), credit: Number(r.credit) }))
  // Accurate's journals print 108.333,33 and 17.333,33 but its ledger keeps the fractions (108.333,333 + 17.333,333), so
  // its HPP is 199.333,33; the ERP ledger posts whole cents, giving 199.333,34 (ADR-0031, accepted 0,01 divergence)
  const CENT: Record<string, string> = { '199.333,33': '199.333,34', '200.666,67': '200.666,66' }
  const want = rep('ProfitLossStandardReport:may').slice(1).map(r => r.map(c => CENT[c] ?? c)) // column header row is ours to label
  expect(F.profitLoss(accounts, balances, '2045-05-01', '2045-05-31', { showZeroBalance: false, showParentAccount: true }).map(F.formatLine)).toEqual(want)
})

// Yearly 2045 views captured after the May probes: every NL-TP journal and document of 2045 under AVERAGE.
// The 0,01 ledger-precision gap of May's returns (see the Laba/Rugi May test) carries into every 2045 total.
const CENT_2045: Record<string, string> = { '9.050.666,67': '9.050.666,66', '9.800.666,67': '9.800.666,66', '6.155.570.666,67': '6.155.570.666,66',
  '6.155.870.666,67': '6.155.870.666,66', '1.213.084,61': '1.213.084,6', '6.146.520.666,67': '6.146.520.666,66', '6.158.670.666,67': '6.158.670.666,66',
  '6.162.670.666,67': '6.162.670.666,66' }
// Accurate repeats the column header on every page; keep the first
const yearly = (p: string) => rep(`${p}:2045`).filter(r => !(r.length === 1 && r[0] === 'per 2045'))
  .filter((r, i, all) => !/^(Deskripsi|Jenis Rasio|Keterangan)$/.test(r[0]!) || all.findIndex(x => x[0] === r[0]) === i)
  .map(r => r.map(c => CENT_2045[c] ?? c))
test('Rasio Keuangan (Per Tahun) 2045 (Trade Portal, AVERAGE)', async () => {
  const { queryFinancialRatios } = await import('../src/reports/queries')
  expect(await queryFinancialRatios(db, 2045)).toEqual(yearly('FinancialRatioReport'))
})
test('Fokus Keuangan 2045 (Trade Portal, AVERAGE): every cell except the Modal Kerja % (ADR-0013)', async () => {
  const { queryFinancialFocus } = await import('../src/reports/queries')
  const mask = (rows: string[][]) => rows.map(r => r[0] === 'Modal Kerja' ? r.slice(0, 3) : r)
  expect(mask(await queryFinancialFocus(db, 2045))).toEqual(mask(yearly('FinancialFocusReport')))
})
test('Neraca (Multi Year) 2043-2045 (Trade Portal, AVERAGE)', async () => {
  const { loadLedger } = await import('../src/reports/queries')
  const { accounts, balances, settings } = await loadLedger(db, '2045-12-31')
  const ys = [2043, 2044, 2045]
  expect([['Deskripsi', ...ys.map(y => `${y} (IDR)`)], ...F.balanceSheetColumns(accounts, balances, settings, ys.map(y => `${y}-12-31`), { showZeroBalance: false, showParentAccount: true }).map(F.formatMulti)])
    .toEqual(yearly('BalanceSheetMultiYearReport'))
})

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

test('HTTP: aging reports follow the company aging basis (ADR-0037), basis= overrides', async () => {
  const { createApp } = await import('../src/app')
  const { createUser } = await import('../src/auth')
  const app = createApp(db)
  await createUser(db, 'nl-tp@example.test', 'rahasia-123')
  const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nl-tp@example.test', password: 'rahasia-123' }) })
  const cookie = login.headers.get('set-cookie')!.split(';')[0]!
  const get = async (p: string) => (await app.request('/api' + p, { headers: { cookie } })).json()
  const ar = `/reports/receivables/aging?asOf=${AS_OF}`, ap = `/reports/payables/aging?asOf=${AS_OF}`
  expect(await get('/settings/report-preferences')).toEqual({ agingBasis: 'DUE_DATE', reportStyle: 'RETAIL' })
  expect(dec(await get(ar))).toEqual(dec(R.agingReceivable(await loadSales(db), AS_OF, 'DUE_DATE')))
  const put = await app.request('/api/settings/report-preferences', { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ agingBasis: 'INVOICE_DATE', reportStyle: 'RETAIL' }) })
  expect(put.status).toBe(200)
  expect(dec(await get(ar))).toEqual(rep('AgingReceivableReport'))
  expect(dec(await get(ap))).toEqual(rep('AgingPayableReport'))
  expect(dec(await get(ar + '&basis=DUE_DATE'))).toEqual(dec(R.agingReceivable(await loadSales(db), AS_OF, 'DUE_DATE')))
  const [log] = await db.execute(sql`SELECT reference FROM activity_log WHERE entity = 'PRF' ORDER BY id DESC LIMIT 1`)
  expect(log!.reference).toBe('Umur INVOICE_DATE, gaya laporan RETAIL')
})
