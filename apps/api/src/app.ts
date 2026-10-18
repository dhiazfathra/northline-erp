import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z, ZodError } from 'zod'
import { balanceSheetQuery, trialBalanceQuery } from '@northline/schemas/ledger-es'
import type { Db } from './db'
import { authRoutes, requireSession, type AuthEnv } from './auth'
import { serveSpa } from './spa'
import { ConcurrencyError } from './es/store'
import { handle } from './ledger/handler'
import { DomainError } from './ledger/deciders'
import { waitFor } from './projections'
import * as I from './reports/inventory'
import * as P from './reports/payables'
import * as R from './reports/receivables'
import { createPurchaseInvoice, createPurchasePayment, upsertVendor } from './purchases/service'
import { createSalesInvoice, createSalesReceipt, upsertCustomer, upsertItem } from './sales/service'
import { cogsByInvoice, loadInventory, loadPurchases, loadSales, queryBalanceSheet, queryBankBook, queryCashAccountList, queryCashFlow, queryCashFlowByAccount, queryFinancialRatios, queryGeneralLedger, queryOwnerEquityChange, queryRetainedEarnings, queryProfitLoss, queryTrialBalance, type CashFlowReport, type GlReport } from './reports/queries'

export function createApp(db: Db) {
  const api = new Hono<AuthEnv>()
    .onError((err, c) => {
      if (err instanceof ZodError) return c.json({ error: 'validation', issues: err.issues }, 422)
      if (err instanceof DomainError) return c.json({ error: err.message }, 409)
      if (err instanceof ConcurrencyError) return c.json({ error: err.message }, 409)
      console.error(err)
      return c.json({ error: 'internal' }, 500)
    })
    .route('/auth', authRoutes(db))
    .use('*', requireSession(db))
    .get('/me', c => c.json({ userId: c.get('userId') }))
    .post('/ledger/commands', async c => {
      // handle() owns parsing (amounts → cents); parsing here too would convert twice
      const result = await handle(db, await c.req.json(), { requestId: c.req.header('x-request-id'), userId: c.get('userId') })
      return c.json(result, 202)
    })
    .get('/reports/trial-balance', async c => {
      const q = trialBalanceQuery.parse(c.req.query())
      const after = Number(c.req.query('after') ?? 0)
      if (after) await waitFor(db, after)
      return c.json(await queryTrialBalance(db, q))
    })
    .get('/reports/profit-loss', async c => c.json(await queryProfitLoss(db, trialBalanceQuery.parse(c.req.query()))))
    .get('/reports/general-ledger/:report{journal-list|all-journals|history|summary|detail|account-journal-detail|account-list}', async c =>
      c.json(await queryGeneralLedger(db, c.req.param('report') as GlReport, trialBalanceQuery.parse(c.req.query()))))
    .get('/reports/retained-earnings', async c => c.json(await queryRetainedEarnings(db, z.coerce.number().int().min(1900).max(9999).parse(c.req.query('year')))))
    .get('/reports/owner-equity-change', async c => c.json(await queryOwnerEquityChange(db, trialBalanceQuery.parse(c.req.query()))))
    .get('/reports/cash-flow/:report{direct|indirect|indirect-detail}', async c =>
      c.json(await queryCashFlow(db, c.req.param('report') as CashFlowReport, trialBalanceQuery.parse(c.req.query()), c.req.query('monthly') === 'true')))
    .get('/reports/financial-ratios', async c => {
      const q = z.object({ year: z.coerce.number().int().min(1900).max(9999), month: z.coerce.number().int().min(1).max(12).optional() }).parse(c.req.query())
      return c.json(await queryFinancialRatios(db, q.year, q.month))
    })
    .get('/reports/cash-bank/:report{bank-book|cash-flow-by-account}', async c => {
      const banks = c.req.queries('bank') ?? []
      const q = trialBalanceQuery.parse(c.req.query())
      return c.json(c.req.param('report') === 'bank-book' ? await queryBankBook(db, banks, q) : await queryCashFlowByAccount(db, banks, q))
    })
    .get('/reports/cash-bank/cash-list', async c => c.json(await queryCashAccountList(db, balanceSheetQuery.parse(c.req.query()).asOf)))
    .post('/sales/customers', async c => { await upsertCustomer(db, await c.req.json()); return c.json({ ok: true }) })
    .post('/sales/items', async c => { await upsertItem(db, await c.req.json()); return c.json({ ok: true }) })
    .post('/sales/invoices', async c => c.json(await createSalesInvoice(db, await c.req.json()), 201))
    .post('/sales/receipts', async c => c.json(await createSalesReceipt(db, await c.req.json()), 201))
    .get('/reports/receivables/:report{invoice-list|sales-by-customer|receipt-list|ar-ledger|ar-history|customer-statement|outstanding}', async c => {
      const d = await loadSales(db), q = c.req.query(), r = c.req.param('report')
      const asOfReports = { outstanding: R.outstandingInvoices, aging: R.agingReceivable, 'aging-detail': R.agingReceivableDetail, 'outstanding-per-customer': R.outstandingPerCustomer } as const
      if (r in asOfReports) return c.json(asOfReports[r as keyof typeof asOfReports](d, balanceSheetQuery.parse(q).asOf))
      const { from, to } = trialBalanceQuery.parse(q)
      const fn = { 'invoice-list': R.salesInvoiceList, 'sales-by-customer': R.salesByCustomer, 'receipt-list': R.salesReceiptList, 'ar-ledger': R.arLedger, 'ar-history': R.arHistory, 'customer-statement': R.customerStatement, 'ar-ledger-detail': R.arLedgerDetail, 'invoice-paid': R.salesInvoicePaid, 'receipt-detail': R.salesReceiptDetail,
        'owing-collection': R.owingCollection, 'by-item': R.salesByItem, 'item-by-customer': R.salesItemByCustomer, 'customer-by-item': R.salesCustomerByItem,
        'by-customer-detail': R.salesByCustomerDetail, 'by-item-detail': R.salesByItemDetail, 'by-branch': R.salesByBranch, 'invoice-detail': R.salesInvoiceDetail }[r]!
      return c.json(fn(d, from, to))
    })
    .post('/purchases/vendors', async c => { await upsertVendor(db, await c.req.json()); return c.json({ ok: true }) })
    .post('/purchases/invoices', async c => c.json(await createPurchaseInvoice(db, await c.req.json()), 201))
    .post('/purchases/payments', async c => c.json(await createPurchasePayment(db, await c.req.json()), 201))
    .get('/reports/payables/:report{invoice-list|payment-list|ap-ledger|ap-history|vendor-statement|ap-ledger-detail|invoice-paid|by-vendor|outstanding|aging|outstanding-per-vendor|aging-detail|by-item|by-item-detail|by-vendor-detail|payment-detail|invoice-detail|per-month}', async c => {
      const d = await loadPurchases(db), q = c.req.query(), r = c.req.param('report')
      const asOfReports = { outstanding: P.outstandingPurchases, aging: P.agingPayable, 'outstanding-per-vendor': P.outstandingPerVendor, 'aging-detail': P.agingPayableDetail } as const
      if (r in asOfReports) return c.json(asOfReports[r as keyof typeof asOfReports](d, balanceSheetQuery.parse(q).asOf))
      if (r === 'per-month') return c.json(P.payablePerMonth(d, z.coerce.number().int().parse(q.year)))
      const { from, to } = trialBalanceQuery.parse(q)
      const fn = { 'invoice-list': R.salesInvoiceList, 'payment-list': R.salesReceiptList, 'ap-ledger': R.arLedger, 'ap-history': R.arHistory, 'vendor-statement': R.customerStatement,
        'ap-ledger-detail': R.arLedgerDetail, 'invoice-paid': R.salesInvoicePaid, 'by-vendor': P.purchaseByVendor,
        'by-item': P.purchaseByItem, 'by-item-detail': P.purchaseByItemDetail, 'by-vendor-detail': P.purchaseByVendorDetail, 'payment-detail': P.purchasePaymentDetail, 'invoice-detail': P.purchaseInvoiceDetail }[r]!
      return c.json(fn(d, from, to))
    })
    .get('/reports/parties/:report{customer-list|vendor-list|sales-flow|purchase-flow|selling-frequency|profitability-by-invoice|profitability-by-customer}', async c => {
      const r = c.req.param('report'), q = c.req.query()
      if (r === 'customer-list' || r === 'vendor-list') {
        const asOf = balanceSheetQuery.parse(q).asOf
        if (r === 'vendor-list') return c.json(R.partyList(await loadPurchases(db), asOf))
        // Accurate prints the creation time in Asia/Jakarta
        const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
        const created = new Map((await db.execute(sql`SELECT no, to_char(created_at AT TIME ZONE 'Asia/Jakarta', 'DD|MM|YYYY HH24:MI:SS') AS t FROM customers`))
          .map(x => { const [dd, mm, rest] = (x.t as string).split('|'); return [x.no as string, `${dd} ${MON[Number(mm) - 1]} ${rest}`] }))
        return c.json(R.partyList(await loadSales(db), asOf, created))
      }
      const { from, to } = trialBalanceQuery.parse(q)
      if (r === 'purchase-flow') return c.json(R.flowHistory(await loadPurchases(db), from, to, false))
      const d = await loadSales(db)
      if (r === 'sales-flow') return c.json(R.flowHistory(d, from, to, true))
      if (r === 'selling-frequency') return c.json(R.sellingItemFrequency(d, from, to))
      const cogs = await cogsByInvoice(db)
      return c.json(r === 'profitability-by-customer' ? R.profitabilityByCustomer(d, from, to, cogs) : R.profitabilityByInvoice(d, from, to, cogs))
    })
    .get('/reports/inventory/:report{valuation|stock-card|valuation-detail|aging|profitability-by-item}', async c => {
      const d = await loadInventory(db), q = c.req.query(), r = c.req.param('report')
      if (r === 'aging') return c.json(I.inventoryAging(d, balanceSheetQuery.parse(q).asOf))
      if (r === 'quantity-by-warehouse') return c.json(I.quantityByWarehouse(d, balanceSheetQuery.parse(q).asOf))
      if (r === 'aging-by-warehouse') return c.json(I.inventoryAgingByWarehouse(d, balanceSheetQuery.parse(q).asOf))
      const { from, to } = trialBalanceQuery.parse(q), items = c.req.queries('item') ?? []
      if (r === 'valuation') return c.json(I.inventoryValuation(d, from, to))
      if (r === 'stock-card') return c.json(I.stockCard(d, items, from, to))
      if (r === 'valuation-detail') return c.json(I.valuationDetail(d, items, from, to))
      if (r === 'item-mutation') return c.json(I.itemMutationByWarehouse(d, items, from, to))
      if (r === 'warehouse-mutation') return c.json(I.warehouseMutationByItem(d, from, to))
      if (r === 'warehouse-summary') return c.json(I.warehouseMutationSummary(d, from, to))
      const sales = (await db.execute(sql`SELECT l.item_no, to_char(i.date,'YYYY-MM-DD') AS date, l.total FROM sales_invoice_lines l JOIN sales_invoices i ON i.number = l.invoice_number`))
        .map(x => ({ item: x.item_no as string, date: x.date as string, total: Number(x.total) }))
      return c.json(I.profitabilityByItem(d, sales, from, to))
    })
    .get('/reports/balance-sheet', async c => c.json(await queryBalanceSheet(db, balanceSheetQuery.parse(c.req.query()))))
  // Single origin: /api plus the embedded SPA (client-side routes fall back to index.html).
  return new Hono().route('/api', api).get('*', serveSpa)
}

export type AppType = ReturnType<typeof createApp>
