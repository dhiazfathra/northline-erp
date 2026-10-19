import * as ML from './master/lists'
import { createCashDocument } from './cash-bank/service'
import * as CB from './reports/cash-bank'
import { createEmployeeLoan, loadLoans, loanHistory, loanInstallments, loanList, upsertEmployee } from './payroll/loans'
import { sql } from 'drizzle-orm'
import { Hono, type Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { secureHeaders } from 'hono/secure-headers'
import { z, ZodError } from 'zod'
import { balanceSheetQuery, isoDate, trialBalanceQuery } from '@northline/schemas/ledger-es'
import type { Db } from './db'
import { authRoutes, requireSession, type AuthEnv } from './auth'
import { serveSpa } from './spa'
import { openApiSpec } from './openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { withActor } from './activity/log'
import { auditList, loadActivity } from './reports/activity-log'
import { approvalList, loadApprovals } from './reports/approvals'
import { ConcurrencyError } from './es/store'
import { handle } from './ledger/handler'
import { DomainError } from './ledger/deciders'
import { waitFor } from './projections'
import * as FA from './reports/fixed-assets'
import * as I from './reports/inventory'
import * as DIM from './reports/dimensions'
import { createFixedAsset, disposeFixedAsset, runPeriodEnd } from './fixed-assets/service'
import { createPurchaseReturn, createSalesReturn } from './returns/service'
import { createItemAdjustment, createItemTransfer } from './inventory/adjustment'
import { costingMethod, setCostingMethod } from './inventory/fifo'
import * as P from './reports/payables'
import * as R from './reports/receivables'
import { createPurchaseDownPayment, createPurchaseInvoice, createPurchaseOrder, createPurchasePayment, createPurchaseRequisition, createReceiveItem, upsertVendor } from './purchases/service'
import { createExchangeInvoice, createDeliveryOrder, createSalesOrder, createSalesQuotation, createSalesDownPayment, createSalesInvoice, createSalesReceipt, deleteMaster, deleteSalesInvoice, editSalesInvoice, upsertCustomer, upsertItem } from './sales/service'
import { loadCashDocs, loadLedger, loadExchanges, loadAdjustments, loadDeliveries, loadTransfers, loadOrders, loadRequisitions, queryFinanceChart, cogsByInvoice, loadFixedAssets, loadInventory, loadPurchases, loadSales, queryBalanceSheet, queryBankBook, queryCashAccountList, queryCashFlow, queryCashFlowByAccount, queryFinancialRatios, queryGeneralLedger, queryOwnerEquityChange, queryRetainedEarnings, queryProfitLoss, queryTrialBalance, type CashFlowReport, type GlReport } from './reports/queries'

/** Socket address under Bun; on Workers the edge's cf-connecting-ip (a client-sent header is never trusted under Bun). */
function clientIp(c: Context): string | null {
  const server = c.env as { requestIP?: (r: Request) => { address: string } | null } | undefined
  return typeof server?.requestIP === 'function' ? server.requestIP(c.req.raw)?.address ?? null : c.req.header('cf-connecting-ip') ?? null
}

export function createApp(db: Db) {
  const api = new Hono<AuthEnv>()
    .onError((err, c) => {
      if (err instanceof ZodError) return c.json({ error: 'validation', issues: err.issues }, 422)
      if (err instanceof DomainError) return c.json({ error: err.message }, 409)
      if (err instanceof ConcurrencyError) return c.json({ error: err.message }, 409)
      console.error(err)
      return c.json({ error: 'internal' }, 500)
    })
    .use('*', bodyLimit({ maxSize: 1024 * 1024, onError: c => c.json({ error: 'payload too large' }, 413) }))
    .route('/auth', authRoutes(db))
    .use('*', requireSession(db))
    // every change made by this request is logged with its user and client IP (ADR-0019)
    .use('*', (c, next) => withActor({ userId: c.get('userId'), ip: clientIp(c) }, next))
    .get('/me', c => c.json({ userId: c.get('userId') }))
    .post('/ledger/commands', async c => {
      // handle() owns parsing (amounts → cents); parsing here too would convert twice
      const result = await handle(db, await c.req.json(), { requestId: c.req.header('x-request-id'), userId: c.get('userId'), ip: clientIp(c) })
      return c.json(result, 202)
    })
    .get('/reports/trial-balance', async c => {
      const q = trialBalanceQuery.parse(c.req.query())
      const after = Number(c.req.query('after') ?? 0)
      if (after) await waitFor(db, after)
      return c.json(await queryTrialBalance(db, q))
    })
    .get('/reports/activity-log', async c => {
      const q = trialBalanceQuery.pick({ from: true, to: true }).parse(c.req.query())
      return c.json(auditList(await loadActivity(db, q.from, q.to), q.from, q.to))
    })
    .get('/reports/approvals', async c => {
      const q = trialBalanceQuery.pick({ from: true, to: true }).parse(c.req.query())
      return c.json(approvalList(await loadApprovals(db), q.from, q.to))
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
    .get('/settings/costing-method', async c => c.json({ method: await costingMethod(db as any), locked: (await db.execute(sql`SELECT 1 FROM stock_moves LIMIT 1`)).length > 0 }))
    .put('/settings/costing-method', async c => {
      const { method } = z.object({ method: z.enum(['FIFO', 'AVERAGE']) }).parse(await c.req.json())
      await db.transaction(tx => setCostingMethod(tx, method)); return c.json({ method })
    })
    .post('/sales/customers', async c => { await upsertCustomer(db, await c.req.json()); return c.json({ ok: true }) })
    .post('/sales/items', async c => { await upsertItem(db, await c.req.json()); return c.json({ ok: true }) })
    .delete('/sales/:kind{customers|items}/:no', async c => { await deleteMaster(db, c.req.param('kind') === 'customers' ? 'customer' : 'item', c.req.param('no')); return c.json({ ok: true }) })
    .post('/sales/invoices', async c => c.json(await createSalesInvoice(db, await c.req.json()), 201))
    .put('/sales/invoices/:number', async c => c.json(await editSalesInvoice(db, c.req.param('number'), await c.req.json())))
    .delete('/sales/invoices/:number', async c => c.json(await deleteSalesInvoice(db, c.req.param('number'), z.object({ idempotencyKey: z.string().min(8) }).parse(await c.req.json()).idempotencyKey)))
    .post('/sales/down-payments', async c => c.json(await createSalesDownPayment(db, await c.req.json()), 201))
    .post('/sales/quotations', async c => c.json(await createSalesQuotation(db, await c.req.json()), 201))
    .post('/sales/orders', async c => c.json(await createSalesOrder(db, await c.req.json()), 201))
    .post('/sales/deliveries', async c => c.json(await createDeliveryOrder(db, await c.req.json()), 201))
    .get('/reports/deliveries/:report{list|detail|history}', async c => {
      const { from, to } = trialBalanceQuery.parse(c.req.query())
      return c.json({ list: R.deliveryList, detail: R.deliveryDetail, history: R.deliveryHistory }[c.req.param('report') as 'list'](await loadSales(db), await loadDeliveries(db), from, to))
    })
    .post('/sales/exchange-invoices', async c => c.json(await createExchangeInvoice(db, await c.req.json()), 201))
    .get('/reports/exchange-invoices', async c => {
      const { from, to } = trialBalanceQuery.parse(c.req.query())
      return c.json(R.exchangeDetail(await loadSales(db), await loadExchanges(db), from, to, new Date().toISOString().slice(0, 10)))
    })
    .post('/employees', async c => { await upsertEmployee(db, await c.req.json()); return c.json({ ok: true }) })
    .post('/employee-loans', async c => c.json(await createEmployeeLoan(db, await c.req.json()), 201))
    .get('/reports/employee-loans/:report{list|installments|history}', async c => {
      const ls = await loadLoans(db), r = c.req.param('report')
      if (r === 'list') return c.json(loanList(ls))
      const l = ls.find(x => x.number === c.req.query('loan'))
      return l ? c.json(r === 'history' ? loanHistory(l) : loanInstallments(l)) : c.json({ error: 'loan not found' }, 404)
    })
    .post('/cash-bank/documents', async c => c.json(await createCashDocument(db, await c.req.json()), 201))
    .get('/reports/cash-bank/:report{payment-list|deposit-list|payment-by-bank|deposit-by-bank|payment-by-bank-detail|deposit-by-bank-detail|payment-load|unreconciled|statement}', async c => {
      const ds = await loadCashDocs(db), r = c.req.param('report'), banks = c.req.queries('bank') ?? [], { from, to } = trialBalanceQuery.parse(c.req.query())
      if (r === 'statement') return c.json(CB.bankStatement())
      if (r === 'payment-list' || r === 'deposit-list') return c.json(CB.cashDocList(ds, r === 'payment-list' ? 'PAY' : 'DEP', from, to))
      if (r === 'payment-load') return c.json(CB.paymentLoad(ds, banks, from, to))
      if (r === 'unreconciled') return c.json(CB.unreconciledBank(ds, (await loadLedger(db, to)).accounts, banks, from, to))
      const kind = r.startsWith('payment') ? 'PAY' : 'DEP'
      return c.json(r.endsWith('detail') ? CB.cashByBankDetail(ds, kind, banks, from, to) : CB.cashByBankSummary(ds, kind, banks, from, to))
    })
    // Branch / department / project dimensions (ADR-0022): master rows, then the P&L reports over them.
    .post('/master/:kind{branches|departments|projects}', async c => {
      const k = c.req.param('kind'), b = z.object({ name: z.string().trim().min(1), description: z.string().default(''), no: z.string().trim().min(1).optional(), isDefault: z.boolean().default(false) }).parse(await c.req.json())
      if (k === 'departments') await db.execute(sql`INSERT INTO departments (name, description) VALUES (${b.name}, ${b.description}) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description`)
      else if (k === 'projects') await db.execute(sql`INSERT INTO projects (name, no) VALUES (${b.name}, ${b.no ?? b.name}) ON CONFLICT (name) DO UPDATE SET no = EXCLUDED.no`)
      else await db.transaction(async tx => {
        if (b.isDefault) await tx.execute(sql`UPDATE branches SET is_default = false`)
        await tx.execute(sql`INSERT INTO branches (name, is_default) VALUES (${b.name}, ${b.isDefault}) ON CONFLICT (name) DO UPDATE SET is_default = EXCLUDED.is_default`)
      })
      return c.json({ ok: true })
    })
    .get('/reports/master/departments', async c => c.json(await DIM.departmentList(db)))
    .get('/reports/dimensions/:report{by-branch|by-department|department-multi-period|compare-department|compare-project|analysis-department}', async c => {
      const q = c.req.query(), r = c.req.param('report'), list = (k: string) => c.req.queries(k) ?? []
      const o = { showZeroBalance: q.showZeroBalance === 'true', showParentAccount: q.showParentAccount !== 'false' }
      const accounts = (await loadLedger(db, '9999-12-31')).accounts, lines = await DIM.loadDimLines(db)
      const d = isoDate
      if (r === 'by-branch') {
        const bs = await db.execute(sql`SELECT name, is_default FROM branches ORDER BY name`)
        const all = bs.map(b => b.name as string), def = (bs.find(b => b.is_default)?.name as string) ?? all[0]!
        return c.json(DIM.profitLossByBranch(accounts, lines, list('branch').length ? list('branch') : all, def, d.parse(q.from), d.parse(q.to), o))
      }
      if (r === 'by-department') return c.json(DIM.profitLossByDepartment(accounts, lines, list('department'), d.parse(q.from), d.parse(q.to), o))
      if (r === 'analysis-department') return c.json(DIM.analysisProfitLossDepartment(accounts, lines, d.parse(q.from), d.parse(q.to)))
      if (r === 'department-multi-period') {
        const [sy, sm] = d.parse(q.from).split('-').map(Number), [ey, em] = d.parse(q.to).split('-').map(Number)
        return c.json(DIM.profitLossDepartmentMultiPeriod(accounts, lines, z.string().min(1).parse(q.department), sy!, sm!, ey!, em!, o))
      }
      const dim = r === 'compare-project' ? 'project' : 'department'
      return c.json(DIM.profitLossComparePeriodBy(accounts, lines, dim, z.string().min(1).parse(q[dim]), { from: d.parse(q.from), to: d.parse(q.to) }, { from: d.parse(q.compareFrom), to: d.parse(q.compareTo) }, o))
    })
    .get('/reports/master/:list{currencies|fob|taxes|shipments|employees|fiscal-fa-types}', async c =>
      c.json(await ({ currencies: ML.currencyList, fob: ML.fobList, taxes: ML.taxList, shipments: ML.shipmentList, employees: ML.employeeList, 'fiscal-fa-types': ML.fiscalFaTypeList }[c.req.param('list') as 'fob'])(db)))
    .post('/sales/receipts', async c => c.json(await createSalesReceipt(db, await c.req.json()), 201))
    .get('/reports/receivables/:report{invoice-list|sales-by-customer|receipt-list|ar-ledger|ar-history|customer-statement|outstanding}', async c => {
      const d = await loadSales(db), q = c.req.query(), r = c.req.param('report')
      const asOfReports = { outstanding: R.outstandingInvoices, aging: R.agingReceivable, 'aging-detail': R.agingReceivableDetail, 'outstanding-per-customer': R.outstandingPerCustomer } as const
      if (r in asOfReports) return c.json(asOfReports[r as keyof typeof asOfReports](d, balanceSheetQuery.parse(q).asOf))
      const { from, to } = trialBalanceQuery.parse(q)
      const fn = { 'invoice-list': R.salesInvoiceList, 'sales-by-customer': R.salesByCustomer, 'receipt-list': R.salesReceiptList, 'ar-ledger': R.arLedger, 'ar-history': R.arHistory, 'customer-statement': R.customerStatement, 'ar-ledger-detail': R.arLedgerDetail, 'invoice-paid': R.salesInvoicePaid, 'receipt-detail': R.salesReceiptDetail,
        'owing-collection': R.owingCollection, 'by-item': R.salesByItem, 'item-by-customer': R.salesItemByCustomer, 'customer-by-item': R.salesCustomerByItem,
        'by-customer-detail': R.salesByCustomerDetail, 'by-item-detail': R.salesByItemDetail, 'by-branch': R.salesByBranch, 'invoice-detail': R.salesInvoiceDetail,
        'down-payments': R.downPaymentsByCustomer, 'down-payment-usage': R.downPaymentUsage }[r]!
      return c.json(fn(d, from, to))
    })
    .post('/purchases/vendors', async c => { await upsertVendor(db, await c.req.json()); return c.json({ ok: true }) })
    .post('/purchases/invoices', async c => c.json(await createPurchaseInvoice(db, await c.req.json()), 201))
    .post('/purchases/down-payments', async c => c.json(await createPurchaseDownPayment(db, await c.req.json()), 201))
    .post('/purchases/orders', async c => c.json(await createPurchaseOrder(db, await c.req.json()), 201))
    .post('/purchases/receive-items', async c => c.json(await createReceiveItem(db, await c.req.json()), 201))
    .get('/reports/orders/:report{order-list|order-detail|order-by-item|order-by-vendor|receive-list|receive-detail}', async c => {
      const { from, to } = trialBalanceQuery.parse(c.req.query())
      return c.json({ 'order-list': P.orderList, 'order-detail': P.orderDetail, 'order-by-item': P.orderByItem, 'order-by-vendor': P.orderByVendor,
        'receive-list': P.receiveList, 'receive-detail': P.receiveDetail }[c.req.param('report') as 'order-list'](await loadOrders(db), from, to))
    })
    .post('/inventory/adjustments', async c => c.json(await createItemAdjustment(db, await c.req.json()), 201))
    .get('/reports/inventory/adjustments', async c => { const { from, to } = trialBalanceQuery.parse(c.req.query()); return c.json(I.adjustmentDetail(await loadAdjustments(db), from, to)) })
    .post('/purchases/requisitions', async c => c.json(await createPurchaseRequisition(db, await c.req.json()), 201))
    .get('/reports/requisitions/:report{list|detail|by-item|order-status}', async c => {
      const { from, to } = trialBalanceQuery.parse(c.req.query())
      return c.json({ list: P.requisitionList, detail: P.requisitionDetail, 'by-item': P.requisitionByItem, 'order-status': P.requisitionOrderStatus }[c.req.param('report') as 'list'](await loadRequisitions(db), from, to))
    })
    .post('/inventory/transfers', async c => c.json(await createItemTransfer(db, await c.req.json()), 201))
    .get('/reports/inventory/transfers', async c => { const { from, to } = trialBalanceQuery.parse(c.req.query()); return c.json(I.transferList(await loadTransfers(db), from, to)) })
    .post('/purchases/payments', async c => c.json(await createPurchasePayment(db, await c.req.json()), 201))
    .get('/reports/payables/:report{invoice-list|payment-list|ap-ledger|ap-history|vendor-statement|ap-ledger-detail|invoice-paid|by-vendor|outstanding|aging|outstanding-per-vendor|aging-detail|by-item|by-item-detail|by-vendor-detail|payment-detail|invoice-detail|per-month|down-payments|down-payment-usage}', async c => {
      const d = await loadPurchases(db), q = c.req.query(), r = c.req.param('report')
      const asOfReports = { outstanding: P.outstandingPurchases, aging: P.agingPayable, 'outstanding-per-vendor': P.outstandingPerVendor, 'aging-detail': P.agingPayableDetail } as const
      if (r in asOfReports) return c.json(asOfReports[r as keyof typeof asOfReports](d, balanceSheetQuery.parse(q).asOf))
      if (r === 'per-month') return c.json(P.payablePerMonth(d, z.coerce.number().int().parse(q.year)))
      const { from, to } = trialBalanceQuery.parse(q)
      const fn = { 'invoice-list': R.salesInvoiceList, 'payment-list': R.salesReceiptList, 'ap-ledger': R.arLedger, 'ap-history': R.arHistory, 'vendor-statement': R.customerStatement,
        'ap-ledger-detail': R.arLedgerDetail, 'invoice-paid': R.salesInvoicePaid, 'by-vendor': P.purchaseByVendor,
        'by-item': P.purchaseByItem, 'by-item-detail': P.purchaseByItemDetail, 'by-vendor-detail': P.purchaseByVendorDetail, 'payment-detail': P.purchasePaymentDetail, 'invoice-detail': P.purchaseInvoiceDetail,
        'down-payments': R.downPaymentsByCustomer, 'down-payment-usage': R.downPaymentUsage }[r]!
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
      const whs = c.req.queries('warehouse')
      if (r === 'quantity-by-warehouse') return c.json(I.quantityByWarehouse(d, balanceSheetQuery.parse(q).asOf, whs))
      if (r === 'aging-by-warehouse') return c.json(I.inventoryAgingByWarehouse(d, balanceSheetQuery.parse(q).asOf))
      const { from, to } = trialBalanceQuery.parse(q), items = c.req.queries('item') ?? []
      if (r === 'valuation') return c.json(I.inventoryValuation(d, from, to))
      if (r === 'stock-card') return c.json(I.stockCard(d, items, from, to))
      if (r === 'valuation-detail') return c.json(I.valuationDetail(d, items, from, to))
      if (r === 'item-mutation') return c.json(I.itemMutationByWarehouse(d, items, from, to))
      if (r === 'warehouse-mutation') return c.json(I.warehouseMutationByItem(d, from, to, whs))
      if (r === 'warehouse-summary') return c.json(I.warehouseMutationSummary(d, from, to, whs))
      const sales = (await db.execute(sql`SELECT l.item_no, to_char(i.date,'YYYY-MM-DD') AS date, l.total FROM sales_invoice_lines l JOIN sales_invoices i ON i.number = l.invoice_number`))
        .map(x => ({ item: x.item_no as string, date: x.date as string, total: Number(x.total) }))
      return c.json(I.profitabilityByItem(d, sales, from, to))
    })
    .post('/fixed-assets', async c => c.json(await createFixedAsset(db, await c.req.json()), 201))
    .post('/fixed-assets/disposals', async c => c.json(await disposeFixedAsset(db, await c.req.json()), 201))
    .post('/period-ends', async c => c.json(await runPeriodEnd(db, await c.req.json()), 201))
    .get('/reports/fixed-assets/:report{list|by-category|history|journal|detail}', async c => {
      const assets = await loadFixedAssets(db), q = c.req.query(), r = c.req.param('report')
      if (r === 'list' || r === 'by-category') { const asOf = balanceSheetQuery.parse(q).asOf; return c.json(r === 'list' ? FA.fixedAssetList(assets, asOf) : FA.fixedAssetByCategory(assets, asOf)) }
      if (r === 'disposed') { const { from, to } = trialBalanceQuery.parse(q); return c.json(FA.disposedList(assets, from, to)) }
      const a = assets.find(x => x.number === q.asset)
      if (!a) return c.json({ error: 'asset not found' }, 404)
      if (r === 'history') { const { from, to } = trialBalanceQuery.parse(q); return c.json(FA.fixedAssetHistory(a, from, to)) }
      return c.json(r === 'journal' ? FA.fixedAssetJournal(a) : FA.fixedAssetDetail(a))
    })
    .post('/sales/returns', async c => c.json(await createSalesReturn(db, await c.req.json()), 201))
    .post('/purchases/returns', async c => c.json(await createPurchaseReturn(db, await c.req.json()), 201))
    .get('/reports/returns/:side{sales|purchase}/:report{list|detail|by-item}', async c => {
      const d = c.req.param('side') === 'sales' ? await loadSales(db) : await loadPurchases(db), { from, to } = trialBalanceQuery.parse(c.req.query())
      return c.json({ list: R.returnList, detail: R.returnDetail, 'by-item': R.returnByItem }[c.req.param('report') as 'list' | 'detail' | 'by-item'](d, from, to))
    })
    .get('/reports/charts/:chart{ar-aging|ap-aging}', async c => {
      const d = c.req.param('chart') === 'ar-aging' ? await loadSales(db) : await loadPurchases(db)
      return c.json(R.agingChart(d, balanceSheetQuery.parse(c.req.query()).asOf))
    })
    .get('/reports/charts/:chart{net-worth|liquidity|roa|roe|revenue-vs-expense}', async c => {
      const { from, to } = trialBalanceQuery.parse(c.req.query())
      return c.json(await queryFinanceChart(db, c.req.param('chart') as 'net-worth', from, to))
    })
    .get('/reports/charts/collection-days', async c => { const { from, to } = trialBalanceQuery.parse(c.req.query()); return c.json(R.collectionDaysChart(await loadSales(db), from, to)) })
    .get('/reports/charts/:chart{monthly-sales|customer-share|item-share}', async c => {
      const d = await loadSales(db), { from, to } = trialBalanceQuery.parse(c.req.query())
      return c.json({ 'monthly-sales': R.monthlySalesChart, 'customer-share': R.customerShareChart, 'item-share': R.itemShareChart }[c.req.param('chart') as 'monthly-sales'](d, from, to))
    })
    .get('/reports/balance-sheet', async c => c.json(await queryBalanceSheet(db, balanceSheetQuery.parse(c.req.query()))))
  // API reference (ADR-0020): behind the session like the rest of /api; spec built lazily from the final route table
  let spec: ReturnType<typeof openApiSpec> | undefined
  api.get('/openapi.json', c => c.json(spec ??= openApiSpec(api, '/api'))).get('/docs', Scalar({ url: '/api/openapi.json', pageTitle: 'Northline ERP API' }))
  // Single origin: /api plus the embedded SPA (client-side routes fall back to index.html).
  return new Hono().use('*', secureHeaders()).route('/api', api).get('*', serveSpa)
}

export type AppType = ReturnType<typeof createApp>
