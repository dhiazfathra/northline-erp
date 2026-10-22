import { sql } from 'drizzle-orm'
import type { MiddlewareHandler } from 'hono'
import { matchedRoutes } from 'hono/route'
import type { AuthEnv } from './auth'
import type { Db } from './db'
import { ACTIONS, PRIVILEGES } from './access/service'

// Route -> privilege (P5, ADR-0040). Keys are `METHOD path` exactly as hono's route table prints them; the matrix test
// (test/access-enforcement.test.ts) fails when a route is in none of PUBLIC_ROUTES, SESSION_ROUTES and ROUTE_PRIVILEGES.

/** No session needed. */
export const PUBLIC_ROUTES = ['POST /api/auth/login', 'POST /api/auth/logout', 'GET /*']
/** Any signed-in user: who am I, and the API reference (ADR-0020). */
export const SESSION_ROUTES = ['GET /api/me', 'GET /api/openapi.json', 'GET /api/docs']
/** Not in the privilege catalog (Manufaktur Demo has no such menu): only users with full access. */
export const FULL_ACCESS = 'full_access'

type Action = (typeof ACTIONS)[number]
/** A catalog key, or per `{a|b}` path value (joined with '/' when a route has two) a catalog key. */
type Entry = string | Record<string, string>

export const ROUTE_PRIVILEGES: Record<string, Entry> = {
  // shortcut: one key for every ledger command (OpenAccount, PostJournal, ...); split per command type if accounts get their own UI.
  'POST /api/ledger/commands': 'buku_besar.jurnal_umum',
  'GET /api/reports/trial-balance': 'TrialBalanceReport',
  'GET /api/reports/activity-log': 'AuditListReport',
  'GET /api/reports/approvals': FULL_ACCESS, // shortcut: no ApprovalListReport in the catalog; map it once a sandbox lists it
  'GET /api/reports/profit-loss': 'ProfitLossStandardReport',
  'GET /api/reports/general-ledger/:report{journal-list|all-journals|history|summary|detail|account-journal-detail|account-list}': {
    'journal-list': 'JournalListReport', 'all-journals': 'AllJournalReport', history: 'GeneralLedgerHistoryReport', summary: 'GeneralLedgerSummaryReport',
    detail: 'GeneralLedgerDetailReport', 'account-journal-detail': 'JournalDetailListReport', 'account-list': 'GlAccountListReport' },
  'GET /api/reports/retained-earnings': 'RetainedEarningReport',
  'GET /api/reports/owner-equity-change': 'OwnerEquityChangedReport',
  'GET /api/reports/cash-flow/:report{direct|indirect|indirect-detail}': { direct: 'CashFlowDirectReport', indirect: 'CashFlowIndirectReport', 'indirect-detail': 'CashFlowDetailIndirectReport' },
  // shortcut: month= serves FinancialRatioPerMonthReport too; one key until the two are separate routes.
  'GET /api/reports/financial-ratios': 'FinancialRatioReport',
  'GET /api/reports/cash-bank/:report{bank-book|cash-flow-by-account}': { 'bank-book': 'BankBookReport', 'cash-flow-by-account': 'CashFlowbyAccountReport' },
  'GET /api/reports/cash-bank/cash-list': 'CashBankAccountListReport',
  // Preferensi has only Aktif: reading and changing both need it.
  'GET /api/settings/costing-method': 'perusahaan.preferensi',
  'PUT /api/settings/costing-method': 'perusahaan.preferensi',
  'GET /api/settings/report-preferences': 'perusahaan.preferensi',
  'PUT /api/settings/report-preferences': 'perusahaan.preferensi',
  // shortcut: master upserts need Buat (create) even when they update an existing row; check Ubah once create and edit are split.
  'POST /api/sales/customers': 'penjualan.pelanggan',
  'POST /api/sales/items': 'persediaan.barang_jasa',
  'DELETE /api/sales/:kind{customers|items}/:no': { customers: 'penjualan.pelanggan', items: 'persediaan.barang_jasa' },
  'POST /api/sales/invoices': 'penjualan.faktur_penjualan',
  'PUT /api/sales/invoices/:number': 'penjualan.faktur_penjualan',
  'DELETE /api/sales/invoices/:number': 'penjualan.faktur_penjualan',
  'POST /api/sales/down-payments': 'penjualan.uang_muka_penjualan',
  'PUT /api/sales/down-payments/:number': 'penjualan.uang_muka_penjualan',
  'DELETE /api/sales/down-payments/:number': 'penjualan.uang_muka_penjualan',
  'POST /api/sales/quotations': 'penjualan.penawaran_penjualan',
  'POST /api/sales/orders': 'penjualan.pesanan_penjualan',
  'POST /api/sales/deliveries': 'penjualan.pengiriman_pesanan',
  'PUT /api/sales/deliveries/:number': 'penjualan.pengiriman_pesanan',
  'DELETE /api/sales/deliveries/:number': 'penjualan.pengiriman_pesanan',
  'GET /api/reports/deliveries/:report{list|detail|history}': { list: 'DeliveryOrderListReport', detail: 'DeliveryOrderDetailReport', history: 'DeliveryOrderHistorySummaryReport' },
  'POST /api/sales/exchange-invoices': 'penjualan.tukar_faktur',
  'GET /api/reports/exchange-invoices': 'ExchangeInvoiceDetailReport',
  'POST /api/employees': 'perusahaan.karyawan',
  'POST /api/employee-loans': 'buku_besar.pinjaman_karyawan',
  'PUT /api/employee-loans/:number': 'buku_besar.pinjaman_karyawan',
  'DELETE /api/employee-loans/:number': 'buku_besar.pinjaman_karyawan',
  // Pencairan Pinjaman has no row in the captured Akses Grup catalog (ADR-0040: uncatalogued routes need full access).
  'POST /api/employee-loan-disbursements': FULL_ACCESS,
  'PUT /api/employee-loan-disbursements/:number': FULL_ACCESS,
  'DELETE /api/employee-loan-disbursements/:number': FULL_ACCESS,
  'POST /api/employee-loan-settlements': FULL_ACCESS,
  'PUT /api/employee-loan-settlements/:number': FULL_ACCESS,
  'DELETE /api/employee-loan-settlements/:number': FULL_ACCESS,
  'POST /api/employee-loan-installments': FULL_ACCESS,
  'PUT /api/employee-loan-installments/:number': FULL_ACCESS,
  'DELETE /api/employee-loan-installments/:number': FULL_ACCESS,
  'POST /api/cash-bank/transfers': 'kas_bank.transfer_kas_bank',
  'PUT /api/cash-bank/transfers/:number': 'kas_bank.transfer_kas_bank',
  'DELETE /api/cash-bank/transfers/:number': 'kas_bank.transfer_kas_bank',
  'POST /api/payroll/runs': 'buku_besar.pencatatan_gaji',
  'PUT /api/payroll/runs/:number': 'buku_besar.pencatatan_gaji',
  'DELETE /api/payroll/runs/:number': 'buku_besar.pencatatan_gaji',
  'GET /api/reports/payroll/:report{monthly|yearly|pph|share|per-year}': {
    monthly: 'EmployeePaymentByEmployeeReport', yearly: 'EmployeePaymentYearlyByEmployeeReport', pph: 'EmployeePphReport',
    share: 'EmployeeSalaryProportionReport', 'per-year': 'EmployeeSalaryPerYearReport' },
  'GET /api/reports/employee-loans/:report{list|installments|history}': { list: 'EmployeeLoanListReport', installments: 'EmployeeLoanInstallmentByEmployeeReport', history: 'EmployeeLoanHistoryReport' },
  // shortcut: one route posts both Pembayaran and Penerimaan; checks Pembayaran for both until the body's kind picks the key.
  'POST /api/cash-bank/documents': 'kas_bank.pembayaran',
  'POST /api/expense-accruals': 'buku_besar.pencatatan_beban',
  'PUT /api/expense-accruals/:number': 'buku_besar.pencatatan_beban',
  'DELETE /api/expense-accruals/:number': 'buku_besar.pencatatan_beban',
  'PUT /api/cash-bank/documents/:number': 'kas_bank.pembayaran',
  'DELETE /api/cash-bank/documents/:number': 'kas_bank.pembayaran',
  'GET /api/reports/cash-bank/:report{payment-list|deposit-list|payment-by-bank|deposit-by-bank|payment-by-bank-detail|deposit-by-bank-detail|payment-load|unreconciled|statement}': {
    'payment-list': 'PaymentListReport', 'deposit-list': 'DepositListReport', 'payment-by-bank': 'PaymentByBankSummaryReport', 'deposit-by-bank': 'DepositByBankSummaryReport',
    'payment-by-bank-detail': 'PaymentByBankDetailReport', 'deposit-by-bank-detail': 'DepositByBankDetailReport', 'payment-load': 'PaymentLoadReport',
    unreconciled: 'UnreconciledBankReport', statement: 'BankStatementReport' },
  // shortcut: branches, departments and projects (ADR-0022) have no catalog key in Manufaktur Demo; full access until a sandbox lists them.
  'POST /api/master/:kind{branches|departments|projects}': FULL_ACCESS,
  'GET /api/reports/master/departments': FULL_ACCESS,
  'GET /api/reports/master/projects': FULL_ACCESS,
  'GET /api/reports/dimensions/:report{by-branch|by-department|by-project|department-multi-period|project-multi-period|compare-department|compare-project|analysis-department|analysis-project}': FULL_ACCESS,
  // shortcut: Pekerjaan Pesanan's menu (job orders, Penyelesaian) is not in the catalog; its reports are.
  'POST /api/job-costing/:kind{job-orders|material-adjustments|roll-overs}': { 'job-orders': FULL_ACCESS, 'material-adjustments': 'persediaan.penambahan_bahan_baku', 'roll-overs': FULL_ACCESS },
  'PUT /api/job-costing/job-orders/:number': FULL_ACCESS,
  'DELETE /api/job-costing/job-orders/:number': FULL_ACCESS,
  'PUT /api/job-costing/material-adjustments/:number': 'persediaan.penambahan_bahan_baku',
  'DELETE /api/job-costing/material-adjustments/:number': 'persediaan.penambahan_bahan_baku',
  'PUT /api/job-costing/roll-overs/:number': FULL_ACCESS,
  'DELETE /api/job-costing/roll-overs/:number': FULL_ACCESS,
  'GET /api/reports/job-costing/:report{job-order-list|material-adjustment-list|material-adjustment-detail|roll-over-list|roll-over-item-detail|roll-over-account-detail}': {
    'job-order-list': 'JobOrderListReport', 'material-adjustment-list': 'MaterialAdjustmentListReport', 'material-adjustment-detail': 'MaterialAdjustmentDetailReport',
    'roll-over-list': 'RollOverListReport', 'roll-over-item-detail': 'RollOverItemDetailReport', 'roll-over-account-detail': 'RollOverAccountDetailReport' },
  'GET /api/reports/manufacturing/:report{purchase-cogs|adjustment-cogs}': { 'purchase-cogs': 'PurchaseCOGSManufactureReport', 'adjustment-cogs': 'AdjustmentCOGSManufactureReport' },
  'POST /api/purchases/transfer-orders': 'pembelian.transfer_pemasok',
  'GET /api/reports/purchases/transfer-order-list': 'TransferOrderListReport',
  // Users and access groups have no catalog key; granting them to a group would let it grant itself everything.
  'POST /api/access/groups': FULL_ACCESS,
  'POST /api/access/branches': FULL_ACCESS,
  'GET /api/reports/access/user-by-branch': 'UserByBranchListReport',
  'GET /api/reports/access/group-privileges': 'AccessGroupPrivilegeListReport',
  'GET /api/reports/access/privileges-by-user': 'AccessPrivilegeByUserListReport',
  'GET /api/reports/tax/ppn/:report{out|in|in-out}': { out: 'TaxationOutReport', in: 'TaxationInReport', 'in-out': 'TaxationInOutReport' },
  'GET /api/reports/tax/:report{sales-receipt-pph|purchase-payment-pph|purchase-invoice-pph-paid}': {
    'sales-receipt-pph': 'SalesReceiptPPhReport', 'purchase-payment-pph': 'PurchasePaymentPPhReport', 'purchase-invoice-pph-paid': 'PurchaseInvoicePphPaidReport' },
  // shortcut: Proyek Kontraktor (ADR-0038) is not in the Manufaktur catalog; full access until Kontraktor Demo's Akses Grup is captured.
  'POST /api/contractor/projects': FULL_ACCESS,
  'POST /api/contractor/:kind{rabs|material-usages|surveys|documents|completions}': FULL_ACCESS,
  'GET /api/reports/contractor/:report{project-list|budget-plan|budget-comparison|journal|material-usage|material-usage-detail|survey-list|survey-detail|progress|bank-mutation|profit-loss}': FULL_ACCESS,
  'GET /api/reports/master/:list{currencies|fob|taxes|shipments|employees|fiscal-fa-types}': {
    currencies: 'CurrencyListReport', fob: 'FreeOnBoardListReport', taxes: 'TaxListReport', shipments: 'ShipmentListReport',
    employees: 'perusahaan.karyawan', // shortcut: no EmployeeListReport in the catalog; Karyawan's Lihat
    'fiscal-fa-types': 'FiscalFaTypeListReport' },
  'POST /api/sales/receipts': 'penjualan.penerimaan_penjualan',
  'PUT /api/sales/receipts/:number': 'penjualan.penerimaan_penjualan',
  'DELETE /api/sales/receipts/:number': 'penjualan.penerimaan_penjualan',
  'GET /api/reports/receivables/:report{invoice-list|sales-by-customer|receipt-list|ar-ledger|ar-history|customer-statement|outstanding|aging|aging-detail|outstanding-per-customer|ar-ledger-detail|invoice-paid|receipt-detail|owing-collection|by-item|item-by-customer|customer-by-item|by-customer-detail|by-item-detail|by-branch|invoice-detail|down-payments|down-payment-usage}': {
    'invoice-list': 'SalesInvoiceListReport', 'sales-by-customer': 'ViewSalesByCustomerReport', 'receipt-list': 'SalesReceiptListReport', 'ar-ledger': 'ARLedgerReport',
    'ar-history': 'ARHistoryReport', 'customer-statement': 'CustomerStatementReport', outstanding: 'OutstandingSalesInvoiceReport', aging: 'AgingReceivableReport',
    'aging-detail': 'AgingReceivableDetailReport', 'outstanding-per-customer': 'OutstandingSalesInvoicePerCustomerReport', 'ar-ledger-detail': 'ARLedgerDetailReport',
    'invoice-paid': 'SalesInvoicePaidReport', 'receipt-detail': 'SalesReceiptListDetailReport', 'owing-collection': 'OwingCollectionPerCustomerReport',
    'by-item': 'ViewSalesByItemReport', 'item-by-customer': 'ViewSalesItemByCustomerReport', 'customer-by-item': 'ViewSalesCustomerByItemReport',
    'by-customer-detail': 'ViewSalesByCustomerDetailReport', 'by-item-detail': 'ViewSalesByItemDetailReport', 'by-branch': 'ViewSalesByBranchReport',
    'invoice-detail': 'SalesInvoiceDetailReport', 'down-payments': 'SalesDownPaymentByCustomerReport', 'down-payment-usage': 'SalesInvoiceDownPaymentDetailReport' },
  'POST /api/purchases/vendors': 'pembelian.pemasok',
  'POST /api/purchases/invoices': 'pembelian.faktur_pembelian',
  'PUT /api/purchases/invoices/:number': 'pembelian.faktur_pembelian',
  'DELETE /api/purchases/invoices/:number': 'pembelian.faktur_pembelian',
  'POST /api/purchases/down-payments': 'pembelian.uang_muka_pembelian',
  'PUT /api/purchases/down-payments/:number': 'pembelian.uang_muka_pembelian',
  'DELETE /api/purchases/down-payments/:number': 'pembelian.uang_muka_pembelian',
  'POST /api/purchases/orders': 'pembelian.pesanan_pembelian',
  'POST /api/purchases/receive-items': 'pembelian.penerimaan_barang',
  'PUT /api/purchases/receive-items/:number': 'pembelian.penerimaan_barang',
  'DELETE /api/purchases/receive-items/:number': 'pembelian.penerimaan_barang',
  'GET /api/reports/orders/:report{order-list|order-detail|order-by-item|order-by-vendor|receive-list|receive-detail}': {
    'order-list': 'PurchaseOrderListReport', 'order-detail': 'PurchaseOrderDetailReport', 'order-by-item': 'PurchaseOrderByItemReport',
    'order-by-vendor': 'PurchaseOrderByVendorReport', 'receive-list': 'ReceiveItemListReport', 'receive-detail': 'ReceiveItemDetailReport' },
  'POST /api/inventory/adjustments': 'persediaan.penyesuaian_persediaan',
  'PUT /api/inventory/adjustments/:number': 'persediaan.penyesuaian_persediaan',
  'DELETE /api/inventory/adjustments/:number': 'persediaan.penyesuaian_persediaan',
  'GET /api/reports/inventory/adjustments': 'InventoryAdjustmentDetailReport',
  'POST /api/purchases/requisitions': 'persediaan.permintaan_barang',
  'GET /api/reports/requisitions/:report{list|detail|by-item|order-status}': {
    list: 'PurchaseRequisitionListReport', detail: 'PurchaseRequisitionDetailReport', 'by-item': 'PurchaseRequisitionByItemReport', 'order-status': 'PurchaseRequisitionOrderStatusReport' },
  'POST /api/inventory/transfers': 'persediaan.pemindahan_barang',
  'PUT /api/inventory/transfers/:number': 'persediaan.pemindahan_barang',
  'DELETE /api/inventory/transfers/:number': 'persediaan.pemindahan_barang',
  'GET /api/reports/inventory/transfers': 'ItemTransferListReport',
  'POST /api/purchases/payments': 'pembelian.pembayaran_pembelian',
  'PUT /api/purchases/payments/:number': 'pembelian.pembayaran_pembelian',
  'DELETE /api/purchases/payments/:number': 'pembelian.pembayaran_pembelian',
  'GET /api/reports/payables/:report{invoice-list|payment-list|ap-ledger|ap-history|vendor-statement|ap-ledger-detail|invoice-paid|by-vendor|outstanding|aging|outstanding-per-vendor|aging-detail|by-item|by-item-detail|by-vendor-detail|payment-detail|invoice-detail|per-month|down-payments|down-payment-usage}': {
    'invoice-list': 'PurchaseInvoiceListReport', 'payment-list': 'PurchasePaymentListReport', 'ap-ledger': 'APLedgerReport', 'ap-history': 'APHistoryReport',
    'vendor-statement': 'VendorStatementReport', 'ap-ledger-detail': 'APLedgerDetailReport', 'invoice-paid': 'PurchaseInvoicePaidReport', 'by-vendor': 'PurchaseByVendorReport',
    outstanding: 'OutstandingPurchaseInvoiceReport', aging: 'AgingPayableReport', 'outstanding-per-vendor': 'OutstandingPurchaseInvoicePerVendorReport',
    'aging-detail': 'AgingPayableDetailReport', 'by-item': 'PurchaseByItemReport', 'by-item-detail': 'PurchaseByItemDetailReport', 'by-vendor-detail': 'PurchaseByVendorDetailReport',
    'payment-detail': 'PurchasePaymentListDetailReport', 'invoice-detail': 'PurchaseInvoiceDetailReport', 'per-month': 'VendorPayablePerMonthReport',
    'down-payments': 'PurchaseDownPaymentByVendorReport', 'down-payment-usage': 'PurchaseInvoiceDownPaymentDetailReport' },
  'GET /api/reports/parties/:report{customer-list|vendor-list|sales-flow|purchase-flow|selling-frequency|profitability-by-invoice|profitability-by-customer}': {
    'customer-list': 'CustomerListReport', 'vendor-list': 'VendorListReport', 'sales-flow': 'SalesFlowHistoryReport', 'purchase-flow': 'PurchaseFlowHistoryReport',
    'selling-frequency': 'SellingItemFrequencyReport', 'profitability-by-invoice': 'ProfitabilityBySalesInvoiceReport', 'profitability-by-customer': 'ProfitabilityByCustomerReport' },
  'GET /api/reports/inventory/:report{valuation|stock-card|valuation-detail|aging|profitability-by-item|warehouse-summary}': {
    valuation: 'InventoryValuationReport', 'stock-card': 'InventoryStockCardReport', 'valuation-detail': 'InventoryValuationDetailReport',
    aging: 'InventoryAgingReport', 'profitability-by-item': 'ProfitabilityByItemReport', 'warehouse-summary': 'WarehouseMutationSummaryReport' },
  'POST /api/fixed-assets': 'aset_tetap.aset_tetap',
  'POST /api/fixed-assets/disposals': 'aset_tetap.disposisi_aset',
  'PUT /api/fixed-assets/disposals/:number': 'aset_tetap.disposisi_aset',
  'DELETE /api/fixed-assets/disposals/:number': 'aset_tetap.disposisi_aset',
  'PUT /api/fixed-assets/:number': 'aset_tetap.aset_tetap',
  'DELETE /api/fixed-assets/:number': 'aset_tetap.aset_tetap',
  'POST /api/fixed-assets/edits': 'aset_tetap.perubahan_aset',
  'GET /api/reports/fixed-assets-edited': 'FixedAssetEditedListReport',
  'PUT /api/fixed-assets/edits/:number': 'aset_tetap.perubahan_aset',
  'DELETE /api/fixed-assets/edits/:number': 'aset_tetap.perubahan_aset',
  'POST /api/period-ends': 'perusahaan.proses_akhir_bulan',
  'PUT /api/period-ends/:period': 'perusahaan.proses_akhir_bulan',
  'DELETE /api/period-ends/:period': 'perusahaan.proses_akhir_bulan',
  'GET /api/reports/fixed-assets/:report{list|by-category|history|journal|detail}': {
    list: 'FixedAssetListReport', 'by-category': 'FixedAssetByCategoryReport', history: 'FixedAssetHistoryReport', journal: 'FixedAssetJournalReport', detail: 'FixedAssetDetailReport' },
  'POST /api/sales/returns': 'penjualan.retur_penjualan',
  'PUT /api/sales/returns/:number': 'penjualan.retur_penjualan',
  'DELETE /api/sales/returns/:number': 'penjualan.retur_penjualan',
  'POST /api/purchases/returns': 'pembelian.retur_pembelian',
  'PUT /api/purchases/returns/:number': 'pembelian.retur_pembelian',
  'DELETE /api/purchases/returns/:number': 'pembelian.retur_pembelian',
  'GET /api/reports/returns/:side{sales|purchase}/:report{list|detail|by-item}': {
    'sales/list': 'SalesReturnListReport', 'sales/detail': 'SalesReturnDetailReport', 'sales/by-item': 'SalesReturnByItemReport',
    'purchase/list': 'PurchaseReturnListReport', 'purchase/detail': 'PurchaseReturnDetailReport', 'purchase/by-item': 'PurchaseReturnByItemReport' },
  'GET /api/reports/charts/:chart{ar-aging|ap-aging}': { 'ar-aging': 'AgingReceivableChartReport', 'ap-aging': 'AgingPayableChartReport' },
  'GET /api/reports/charts/:chart{net-worth|liquidity|roa|roe|revenue-vs-expense}': {
    'net-worth': 'NetWorthChartReport', liquidity: 'LiquidityRatioChartReport', roa: 'ReturnOnAssetChartReport', roe: 'ReturnOnEquityChartReport',
    'revenue-vs-expense': 'RevenueToExpenseComparisonChartReport' },
  'GET /api/reports/charts/collection-days': 'OwingCollectionGraphReport',
  'GET /api/reports/charts/:chart{monthly-sales|customer-share|item-share}': { 'monthly-sales': 'AnnualSalesChartReport', 'customer-share': 'TopSalesCustomerChartReport', 'item-share': 'TopSalesItemChartReport' },
  'GET /api/reports/balance-sheet': 'BalanceSheetStandardReport',
}

const METHOD_ACTION: Record<string, Action> = { GET: 'view', POST: 'create', PUT: 'edit', DELETE: 'delete' }

/** The key and action a request needs: the method's action when the key has it, else Aktif. Undefined = not mapped (deny). */
export function requiredPrivilege(method: string, route: string, path: string): { key: string; action: Action } | undefined {
  const e = ROUTE_PRIVILEGES[`${method} ${route}`]
  if (e === undefined) return
  const got = path.split('/')
  const key = typeof e === 'string' ? e : e[route.split('/').flatMap((s, i) => s.includes('{') ? [got[i]] : []).join('/')]
  if (key === FULL_ACCESS) return { key, action: 'enable' }
  const mask = key && PRIVILEGES.get(key)
  const action = mask ? ([METHOD_ACTION[method], 'enable'] as Action[]).find(a => mask[ACTIONS.indexOf(a)] === 'x') : undefined
  return action && { key: key!, action }
}

/** 403 unless the user has full access or one of their groups grants the route's key and action. */
export const requirePrivilege = (db: Db): MiddlewareHandler<AuthEnv> => async (c, next) => {
  const route = matchedRoutes(c).find(r => r.method !== 'ALL') // the handler that will answer
  if (!route) return next() // no handler: hono answers 404
  const id = `${route.method} ${route.path}`
  if (SESSION_ROUTES.includes(id) || PUBLIC_ROUTES.includes(id)) return next()
  const need = requiredPrivilege(route.method, route.path, c.req.path)
  // shortcut: the group's time restriction (restriction_days/from/to) is not checked; every captured group is 00.00-23.59.
  const [r] = need ? await db.execute(sql`SELECT u.full_access OR (${need.key} <> ${FULL_ACCESS} AND EXISTS (
      SELECT 1 FROM access_group_users gu JOIN access_groups g ON g.name = gu.group_name
      WHERE gu.user_id = u.id AND g.privileges -> ${need.key} @> jsonb_build_array(${need.action}::text))) AS ok
    FROM users u WHERE u.id = ${c.get('userId')}`) : []
  if (!r?.ok) return c.json({ error: 'forbidden' }, 403)
  await next()
}
