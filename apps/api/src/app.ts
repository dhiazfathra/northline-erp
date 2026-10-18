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
import * as R from './reports/receivables'
import { createSalesInvoice, createSalesReceipt, upsertCustomer, upsertItem } from './sales/service'
import { loadSales, queryBalanceSheet, queryBankBook, queryCashAccountList, queryCashFlow, queryCashFlowByAccount, queryFinancialRatios, queryGeneralLedger, queryOwnerEquityChange, queryRetainedEarnings, queryProfitLoss, queryTrialBalance, type CashFlowReport, type GlReport } from './reports/queries'

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
      if (r === 'outstanding' || r === 'aging' || r === 'aging-detail') {
        const asOf = balanceSheetQuery.parse(q).asOf
        return c.json(r === 'outstanding' ? R.outstandingInvoices(d, asOf) : r === 'aging' ? R.agingReceivable(d, asOf) : R.agingReceivableDetail(d, asOf))
      }
      const { from, to } = trialBalanceQuery.parse(q)
      const fn = { 'invoice-list': R.salesInvoiceList, 'sales-by-customer': R.salesByCustomer, 'receipt-list': R.salesReceiptList, 'ar-ledger': R.arLedger, 'ar-history': R.arHistory, 'customer-statement': R.customerStatement, 'ar-ledger-detail': R.arLedgerDetail, 'invoice-paid': R.salesInvoicePaid, 'receipt-detail': R.salesReceiptDetail }[r]!
      return c.json(fn(d, from, to))
    })
    .get('/reports/balance-sheet', async c => c.json(await queryBalanceSheet(db, balanceSheetQuery.parse(c.req.query()))))
  // Single origin: /api plus the embedded SPA (client-side routes fall back to index.html).
  return new Hono().route('/api', api).get('*', serveSpa)
}

export type AppType = ReturnType<typeof createApp>
