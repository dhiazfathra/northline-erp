// Manufaktur Demo seed: every root docs/reports/fixtures/*.json that carries input data (all captured on Manufaktur Demo), replayed
// from the apps/api/test replays in chronological order so the "Builds on" chains hold. Costing FIFO.
// Idempotent: keyed commands carry one canonical key per fixture record (`<fixture>-<ref>`), masters are skip-if-exists, the few
// unkeyed documents are guarded by their number.
//
// Report-only (nothing to seed): activity-log-a7 (replays an HTTP session that creates then deletes records), cash-bank, cash-flow,
// charts, count-sheet, equity, financial-ratios, financial-statements, general-ledger, item-list, sales-views, stock-movement.
// Skipped for conflicts: none. Notes: items/customers/vendors that several fixtures define are merged into one row (the richer
// definition wins, e.g. NL-T2-S1 keeps expenseAccount from T3/T19/T31); tax-t19's T23 projection docs (SI.2026.10.00014,
// PI.2026.10.00006) are dated 2026 and so show as opening balances in the 2033 AR/AP windows (500.000 on NL-T2 Pelanggan A).
import { sql } from 'drizzle-orm'
import t10 from '../../../../docs/reports/fixtures/adjustment-t10.json'
import t11 from '../../../../docs/reports/fixtures/asset-disposal-t11.json'
import t34 from '../../../../docs/reports/fixtures/asset-edit-t34.json'
import t18 from '../../../../docs/reports/fixtures/cash-bank-t18.json'
import t7 from '../../../../docs/reports/fixtures/downpayment-t7.json'
import t17 from '../../../../docs/reports/fixtures/employee-loan-t17.json'
import t16 from '../../../../docs/reports/fixtures/exchange-t16.json'
import t26 from '../../../../docs/reports/fixtures/expense-accrual-t26.json'
import t35 from '../../../../docs/reports/fixtures/fiscal-asset-t35.json'
import t5 from '../../../../docs/reports/fixtures/fixed-asset-t5.json'
import t31 from '../../../../docs/reports/fixtures/fx-t31.json'
import t4 from '../../../../docs/reports/fixtures/inventory-t4.json'
import t32 from '../../../../docs/reports/fixtures/item-group-t32.json'
import ml from '../../../../docs/reports/fixtures/master-lists.json'
import t20 from '../../../../docs/reports/fixtures/price-t20.json'
import t8 from '../../../../docs/reports/fixtures/purchase-dp-t8.json'
import t25 from '../../../../docs/reports/fixtures/purchase-expense-t25.json'
import t9 from '../../../../docs/reports/fixtures/purchase-order-t9.json'
import t3 from '../../../../docs/reports/fixtures/purchase-t3.json'
import t12 from '../../../../docs/reports/fixtures/requisition-t12.json'
import t6 from '../../../../docs/reports/fixtures/returns-t6.json'
import t14 from '../../../../docs/reports/fixtures/sales-order-t14.json'
import t2 from '../../../../docs/reports/fixtures/sales-t2.json'
import t33 from '../../../../docs/reports/fixtures/serial-t33.json'
import t21 from '../../../../docs/reports/fixtures/targets-t21.json'
import t19 from '../../../../docs/reports/fixtures/tax-t19.json'
import t15 from '../../../../docs/reports/fixtures/transfer-t15.json'
import tb from '../../../../docs/reports/fixtures/trial-balance.json'
import t24 from '../../../../docs/reports/fixtures/unbilled-t24.json'
import t27 from '../../../../docs/reports/fixtures/vendor-price-t27.json'
import { reconcileBankEntry } from '../../src/cash-bank/reconcile'
import { createCashDocument, createExpenseAccrual } from '../../src/cash-bank/service'
import type { Db } from '../../src/db'
import { createFixedAsset, disposeFixedAsset, editFixedAsset, runPeriodEnd } from '../../src/fixed-assets/service'
import { createItemAdjustment, createItemTransfer } from '../../src/inventory/adjustment'
import { handle } from '../../src/ledger/handler'
import { createEmployeeLoan, upsertEmployee } from '../../src/payroll/loans'
import { createPurchaseDownPayment, createPurchaseInvoice, createPurchaseOrder, createPurchasePayment, createPurchaseRequisition, createReceiveItem,
  createVendorPrice, reportSptMasa, upsertVendor } from '../../src/purchases/service'
import { saveSalesTarget } from '../../src/reports/targets'
import { createPurchaseReturn, createSalesReturn } from '../../src/returns/service'
import { createSellingPriceAdjustment } from '../../src/sales/pricing'
import { createDeliveryOrder, createExchangeInvoice, createSalesDownPayment, createSalesInvoice, createSalesOrder, createSalesReceipt, upsertCustomer, upsertItem } from '../../src/sales/service'

const RE = '300002'
export default async function seed(db: Db, sync: () => Promise<void>) {
  const has = async (table: string, col: string, val: string) => (await db.execute(sql`SELECT 1 FROM ${sql.identifier(table)} WHERE ${sql.identifier(col)} = ${val} LIMIT 1`)).length > 0
  const once = async (table: string, col: string, val: string, fn: () => Promise<unknown>) => { if (!(await has(table, col, val))) await fn() }
  const uniq = <T>(xs: T[], key: (x: T) => string) => [...new Map(xs.map(x => [key(x), x] as const).reverse()).values()].reverse() // first wins

  // accounts: trial balance first (its NL-T1 rows win), then every fixture's, skipping what a dev DB already opened under another key
  const accounts = uniq([...tb.accounts, { no: RE, name: 'Laba Ditahan', type: 'EQUITY' }, ...[t2, t3, t4, t5, t6, t7, t8, t10, t11, t14, t19, t20, t24, t25, t26, t31]
    .flatMap(f => (f as any).accounts as { no: string; name: string; type: string }[])], a => a.no)
  const open = new Set((await db.execute(sql`SELECT no FROM accounts`)).map(r => r.no as string))
  for (const a of accounts)
    if (!open.has(a.no)) await handle(db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await sync()
  await db.execute(sql`INSERT INTO ledger_settings (retained_earnings_account, fiscal_year_start_month, costing_method)
    SELECT ${RE}, ${tb.fiscalYearStartMonth}, 'FIFO' WHERE NOT EXISTS (SELECT 1 FROM ledger_settings)`)
  for (const j of tb.journals)
    await handle(db, { type: 'PostJournal', idempotencyKey: `seed-${j.ref}`, journalId: crypto.randomUUID(), date: j.date, description: j.description,
      lines: j.lines.map(l => ({ ...l, side: l.side as 'DEBIT' | 'CREDIT' })) })

  // master lists (master-lists.json) and the PPN tax (tax-t19.json, which adds the sales/purchase accounts to the same row)
  for (const c of ml.currencies) await db.execute(sql`INSERT INTO currencies VALUES (${c.code}, ${c.name}, ${c.symbol}, ${c.converter}) ON CONFLICT DO NOTHING`)
  for (const [i, n] of ml.fobs.entries()) await db.execute(sql`INSERT INTO fobs VALUES (${n}, ${i}) ON CONFLICT DO NOTHING`)
  for (const [i, t] of ml.taxes.entries()) await db.execute(sql`INSERT INTO taxes (name, rate, seq) VALUES (${t.name}, ${t.rate}, ${i}) ON CONFLICT DO NOTHING`)
  for (const [i, t] of ml.fiscalFaTypes.entries()) await db.execute(sql`INSERT INTO fiscal_fa_types VALUES (${t.name}, ${t.lifeYears}, ${t.method}, ${i}) ON CONFLICT DO NOTHING`)
  for (const e of ml.employees) await db.execute(sql`INSERT INTO employees (no, name) VALUES (${e.no}, ${e.name}) ON CONFLICT DO NOTHING`)
  for (const [i, t] of t19.taxes.entries())
    await db.execute(sql`INSERT INTO taxes (name, rate, seq, sales_account, purchase_account) VALUES (${t.name}, ${t.rate}, ${i}, ${t.salesAccount}, ${t.purchaseAccount})
      ON CONFLICT (name) DO UPDATE SET sales_account = EXCLUDED.sales_account, purchase_account = EXCLUDED.purchase_account
      WHERE (taxes.sales_account, taxes.purchase_account) IS DISTINCT FROM (EXCLUDED.sales_account, EXCLUDED.purchase_account)`)

  // customers / vendors / items: each fixture's rows merged (a later fixture only adds fields), created once. The item patches of
  // returns-t6 (sales return account) and sales-order-t14 (delivered-stock account) only matter to returns and deliveries.
  const merge = <T extends { no: string }>(xs: T[]) => [...xs.reduce((m, x) => m.set(x.no, { ...m.get(x.no), ...x }), new Map<string, T>()).values()]
  for (const c of merge([...t2.customers, ...t19.customers, t31.customer] as any[])) await once('customers', 'no', c.no, () => upsertCustomer(db, c))
  for (const v of merge([...t3.vendors, ...t19.vendors] as any[])) await once('vendors', 'no', v.no, () => upsertVendor(db, v))
  const items = merge([...t2.items, ...t3.items, ...t4.items, ...t19.items, ...t20.items, t31.item, ...t32.items, t33.item, t6.itemPatch, t14.itemPatch] as any[])
  for (const i of [...items.filter(i => i.type !== 'GROUP'), ...items.filter(i => i.type === 'GROUP')]) await upsertItem(db, i) // upsert, so a DB seeded before an item gained its accounts is brought up to date
  await sync()

  const post = async (p: string, d: any, extra: object = {}) => {
    const input = { ...d, ...extra, idempotencyKey: `${p}-${d.ref}` }
    switch (d.kind) {
      case 'SalesInvoice': return createSalesInvoice(db, input)
      case 'SalesReceipt': return createSalesReceipt(db, input)
      case 'SalesDownPayment': return createSalesDownPayment(db, input)
      case 'PurchaseInvoice': return createPurchaseInvoice(db, input)
      case 'PurchasePayment': return createPurchasePayment(db, input)
      case 'PurchaseDownPayment': return createPurchaseDownPayment(db, input)
      default: throw new Error(`unknown document kind ${d.kind}`)
    }
  }

  // 2033: sales (T2), purchases (T3), inventory (T4), returns (T6)
  for (const d of t2.documents as any[]) await post('t2', d)
  for (const d of t3.documents as any[]) await post('t3', d)
  for (const d of t4.documents as any[]) await post('t4', d)
  for (const d of t6.documents as any[]) await (d.kind === 'SalesReturn' ? createSalesReturn : createPurchaseReturn)(db, { idempotencyKey: `t6-${d.ref}`, ...d })
  await sync()

  // 2034: fixed asset + month ends (T5), down payments (T7), disposal (T11), purchase DP (T8), PO chain (T9), adjustments (T10)
  await createFixedAsset(db, { idempotencyKey: 't5-asset', ...t5.asset } as any)
  for (const p of t5.monthEnds) await runPeriodEnd(db, { idempotencyKey: `t5-pe-${p}`, period: p })
  for (const d of t7.documents as any[]) await post('t7', d)
  await disposeFixedAsset(db, { idempotencyKey: 't11-dispose', ...t11.disposal })
  for (const d of t8.documents as any[]) await post('t8', d)
  const [po, ri, pi] = t9.documents as any[]
  await once('purchase_orders', 'number', po.number, () => createPurchaseOrder(db, po))
  await once('receive_items', 'number', ri.number, () => createReceiveItem(db, ri))
  await createPurchaseInvoice(db, { idempotencyKey: 't9-pi-0001', ...pi })
  for (const d of t10.documents as any[]) await createItemAdjustment(db, { idempotencyKey: `t10-${d.number}`, ...d })
  await once('purchase_requisitions', 'number', t12.requisition.number, () => createPurchaseRequisition(db, t12.requisition))
  await sync()
  await once('sales_orders', 'number', t14.order.number, () => createSalesOrder(db, t14.order as any))
  await createDeliveryOrder(db, { idempotencyKey: 't14-do-0001', ...t14.delivery } as any)
  await createSalesInvoice(db, { idempotencyKey: 't14-si-0001', ...t14.invoice } as any)
  await once('exchange_invoices', 'number', t16.exchange.number, () => createExchangeInvoice(db, t16.exchange))
  for (const t of t15.transfers) await once('item_transfers', 'number', t.number, () => createItemTransfer(db, t as any))
  await once('employee_loans', 'number', t17.loan.number, async () => { await upsertEmployee(db, t17.employee); await createEmployeeLoan(db, t17.loan) })
  await sync()

  // 2035: cash documents (T18), tax / cheques / installments / SPT / bank reconciliation / projection docs (T19-T23), prices (T20), targets (T21)
  for (const d of t18.documents) await createCashDocument(db, { idempotencyKey: `t18-${d.number}`, ...(d as any) })
  for (const d of t19.documents as any[]) await post('t19', d, { discountAccount: t19.invoiceDiscountAccount, discPct: d.discPct ?? 0 })
  for (const s of t19.sptMasa) await once('spt_masa', 'from_date', s.from, () => reportSptMasa(db, s.from, s.to))
  await sync()
  for (const r of t19.bankReconciliations) await once('bank_reconciliations', 'doc_number', r.document, () => reconcileBankEntry(db, r as any))
  for (const a of t20.adjustments) await once('selling_price_adjustments', 'number', a.number, () => createSellingPriceAdjustment(db, a as any))
  for (const t of t21.targets) await once('sales_targets', 'name', t.name, () => saveSalesTarget(db, t as any))

  // 2036: unbilled receipt (T24), purchase expenses (T25), accruals (T26), vendor prices (T27), USD invoice + receipt (T31), serials (T33), asset edit (T34)
  await once('receive_items', 'number', t24.receipt.number, () => createReceiveItem(db, t24.receipt as any))
  for (const [i, inv] of t25.invoices.entries()) await createPurchaseInvoice(db, { idempotencyKey: `t25-pi-${i}`, ...inv } as any)
  for (const a of t26.accruals) await createExpenseAccrual(db, { idempotencyKey: `t26-${a.number}`, ...a })
  for (const p of t27.prices) await once('vendor_prices', 'number', p.number, () => createVendorPrice(db, p))
  await createSalesInvoice(db, { idempotencyKey: 't31-si-0001', ...t31.invoice } as any)
  await createSalesReceipt(db, { idempotencyKey: 't31-sr-0001', ...t31.receipt } as any)
  await createPurchaseInvoice(db, { idempotencyKey: 't33-pi-0001', ...t33.invoice } as any)
  await createFixedAsset(db, { idempotencyKey: 't34-asset', ...t34.asset } as any)
  await once('fixed_asset_edits', 'number', t34.edit.number, () => editFixedAsset(db, t34.edit))
  await sync()

  // 2037: unrealized-gain USD invoice (T36), fiscal assets (T35)
  await createSalesInvoice(db, { idempotencyKey: 't36-si-0001', ...(t31 as any).t36.invoice })
  for (const a of t35.assets) await createFixedAsset(db, { idempotencyKey: `t35-${a.number}`, ...a } as any)
  await sync()
}
