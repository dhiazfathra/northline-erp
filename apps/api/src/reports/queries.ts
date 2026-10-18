import { sql } from 'drizzle-orm'
import type { BalanceSheetQuery, TrialBalanceQuery } from '@northline/schemas/ledger-es'
import type { Db } from '../db'
import { trialBalance, type AccountType } from './trial-balance'
import { balanceSheet, months, profitLoss } from './financial-statements'
import { ownerEquityChange, retainedEarnings } from './equity'
import { bsTotals, financialRatios, plTotals } from './financial-ratios'
import { bankBook, cashAccountList, cashFlowByAccount } from './cash-bank'
import { cashFlowDirect, cashFlowIndirect, cashFlowIndirectDetail, formatCashFlow } from './cash-flow'
import { allJournals, glAccountList, glDetail, glHistory, glSummary, journalDetailList, journalList, type Journal } from './general-ledger'

/** Reads only projections + master data, never the event store. */
async function loadLedger(db: Db, to: string) {
  const accounts = (await db.execute(sql`SELECT no, name, type, parent_no FROM accounts`)).map(r => ({
    no: r.no as string, name: r.name as string, type: r.type as AccountType, parentNo: (r.parent_no as string) ?? null,
  }))
  const balances = (await db.execute(sql`SELECT account_no, to_char(date, 'YYYY-MM-DD') AS date, debit, credit FROM account_daily_balances WHERE date <= ${to}`))
    .map(r => ({ account: r.account_no as string, date: r.date as string, debit: Number(r.debit), credit: Number(r.credit) }))
  const [s] = await db.execute(sql`SELECT retained_earnings_account, fiscal_year_start_month FROM ledger_settings`)
  if (!s) throw new Error('ledger_settings not configured')
  return { accounts, balances, settings: { retainedEarningsAccount: s.retained_earnings_account as string, fiscalYearStartMonth: Number(s.fiscal_year_start_month) } }
}

export async function queryTrialBalance(db: Db, q: TrialBalanceQuery) {
  const { accounts, balances, settings } = await loadLedger(db, q.to)
  return trialBalance(accounts, balances, settings, q)
}

export async function queryProfitLoss(db: Db, q: TrialBalanceQuery) {
  const { accounts, balances } = await loadLedger(db, q.to)
  return profitLoss(accounts, balances, q.from, q.to, q)
}

export async function queryBalanceSheet(db: Db, q: BalanceSheetQuery) {
  const { accounts, balances, settings } = await loadLedger(db, q.asOf)
  return balanceSheet(accounts, balances, settings, q.asOf, q)
}

export async function loadJournals(db: Db, from: string, to: string): Promise<Journal[]> {
  const rows = await db.execute(sql`
    SELECT j.journal_id, j.number, j.source_type, to_char(j.date, 'YYYY-MM-DD') AS date, j.description, l.account_no, l.debit, l.credit, l.memo
    FROM journals j JOIN journal_lines l USING (journal_id)
    WHERE j.date BETWEEN ${from} AND ${to} ORDER BY j.date, j.number, l.line_no`)
  const byId = new Map<string, Journal>()
  for (const r of rows) {
    const id = r.journal_id as string
    if (!byId.has(id)) byId.set(id, { number: r.number as string, date: r.date as string, description: r.description as string, sourceType: r.source_type as string, lines: [] })
    byId.get(id)!.lines.push({ account: r.account_no as string, debit: Number(r.debit), credit: Number(r.credit), memo: r.memo as string | null })
  }
  return [...byId.values()]
}

export type GlReport = 'journal-list' | 'all-journals' | 'history' | 'summary' | 'detail' | 'account-journal-detail' | 'account-list'
export async function queryGeneralLedger(db: Db, report: GlReport, q: TrialBalanceQuery): Promise<string[][]> {
  const { accounts, balances, settings } = await loadLedger(db, q.to)
  if (report === 'summary') return glSummary(accounts, balances, settings, q.from, q.to, q.showZeroBalance)
  if (report === 'account-list') return glAccountList(accounts, balances, settings, q.to)
  const journals = await loadJournals(db, q.from, q.to)
  switch (report) {
    case 'journal-list': return journalList(journals)
    case 'all-journals': return allJournals(journals, accounts)
    case 'history': return glHistory(journals, accounts)
    case 'detail': return glDetail(accounts, balances, settings, journals, q.from, q.to)
    case 'account-journal-detail': return journalDetailList(accounts, balances, settings, journals, q.from, q.to)
  }
}

export async function queryRetainedEarnings(db: Db, year: number) {
  const { accounts, balances, settings } = await loadLedger(db, `${year}-12-31`)
  return retainedEarnings(accounts, balances, settings, year)
}

export async function queryOwnerEquityChange(db: Db, q: TrialBalanceQuery) {
  const { accounts, balances, settings } = await loadLedger(db, q.to)
  return ownerEquityChange(accounts, balances, settings, q.from, q.to)
}

export type CashFlowReport = 'direct' | 'indirect' | 'indirect-detail'
/** `monthly` splits [from, to] into calendar-month columns (the Multi Period variants). */
export async function queryCashFlow(db: Db, report: CashFlowReport, q: TrialBalanceQuery, monthly = false) {
  const { accounts, balances } = await loadLedger(db, q.to)
  const periods = monthly ? months(Number(q.from.slice(0, 4)), Number(q.from.slice(5, 7)), Number(q.to.slice(0, 4)), Number(q.to.slice(5, 7))) : [{ from: q.from, to: q.to }]
  const rows = report === 'indirect' ? cashFlowIndirect(accounts, balances, periods)
    : report === 'indirect-detail' ? cashFlowIndirectDetail(accounts, balances, periods)
    : cashFlowDirect(accounts, balances, await loadJournals(db, q.from, q.to), periods)
  return formatCashFlow(rows, periods)
}

/** Rasio Keuangan: `month` given → per month (vs previous month), else per year (vs previous year). */
export async function queryFinancialRatios(db: Db, year: number, month?: number) {
  const end = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  const { accounts, balances, settings } = await loadLedger(db, month ? end(year, month) : `${year}-12-31`)
  const o = { showZeroBalance: true, showParentAccount: true }
  const bs = (d: string) => bsTotals(balanceSheet(accounts, balances, settings, d, o))
  const col = (from: string, to: string) => ({ start: bs(end(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1)), end: bs(to), pl: plTotals(profitLoss(accounts, balances, from, to, o)) })
  if (!month) return financialRatios(col(`${year}-01-01`, `${year}-12-31`), col(`${year - 1}-01-01`, `${year - 1}-12-31`), false)
  const [py, pm] = month === 1 ? [year - 1, 12] : [year, month - 1]
  const first = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}-01`
  return financialRatios(col(first(year, month), end(year, month)), col(first(py, pm), end(py, pm)), true)
}

export async function queryBankBook(db: Db, banks: string[], q: TrialBalanceQuery) {
  const { accounts, balances } = await loadLedger(db, q.to)
  return bankBook(accounts, balances, await loadJournals(db, q.from, q.to), banks, q.from, q.to)
}
export async function queryCashFlowByAccount(db: Db, banks: string[], q: TrialBalanceQuery) {
  const { accounts } = await loadLedger(db, q.to)
  return cashFlowByAccount(accounts, await loadJournals(db, q.from, q.to), banks, q.from, q.to)
}
export async function queryCashAccountList(db: Db, asOf: string) {
  const { accounts, balances, settings } = await loadLedger(db, asOf)
  return cashAccountList(accounts, balances, settings, asOf)
}

export async function loadSales(db: Db): Promise<import('./receivables').SalesData> {
  const customers = new Map((await db.execute(sql`SELECT no, name FROM customers`)).map(r => [r.no as string, r.name as string]))
  const uses = await db.execute(sql`SELECT invoice_number, dp_number, amount FROM sales_dp_usages`)
  const invoices = (await db.execute(sql`SELECT number, customer_no, kind, to_char(date,'YYYY-MM-DD') AS date, to_char(due_date,'YYYY-MM-DD') AS due, description, total FROM sales_invoices`))
    .map(r => ({ number: r.number as string, customer: r.customer_no as string, kind: r.kind as 'SI' | 'DP', date: r.date as string, dueDate: r.due as string, description: r.description as string, total: Number(r.total),
      dpUses: uses.filter(u => u.invoice_number === r.number).map(u => ({ dp: u.dp_number as string, amount: Number(u.amount) })) }))
  const invLines = await db.execute(sql`SELECT l.invoice_number, l.item_no, i.name AS item_name, i.unit, l.quantity, l.unit_price, l.total
    FROM sales_invoice_lines l JOIN items i ON i.no = l.item_no ORDER BY l.invoice_number, l.seq`)
  for (const inv of invoices) (inv as any).lines = invLines.filter(l => l.invoice_number === inv.number).map(l => ({
    item: l.item_no as string, itemName: l.item_name as string, unit: l.unit as string, qty: Number(l.quantity), price: Number(l.unit_price), total: Number(l.total) }))
  const lines = await db.execute(sql`SELECT receipt_number, invoice_number, amount FROM sales_receipt_lines`)
  const receipts = (await db.execute(sql`SELECT r.number, r.customer_no, a.name AS bank_name, to_char(r.date,'YYYY-MM-DD') AS date, r.description, r.amount FROM sales_receipts r JOIN accounts a ON a.no = r.bank_no`))
    .map(r => ({ number: r.number as string, customer: r.customer_no as string, bankName: r.bank_name as string, date: r.date as string, description: r.description as string, amount: Number(r.amount),
      payments: lines.filter(l => l.receipt_number === r.number).map(l => ({ invoice: l.invoice_number as string, amount: Number(l.amount) })) }))
  return { customers, invoices, receipts, returns: await loadReturns(db, 'sales') }
}

/** Purchases in the shape the shared receivable/payable report functions use (parties = vendors, AP labels). */
export async function loadPurchases(db: Db): Promise<import('./receivables').SalesData> {
  const { AP } = await import('./receivables')
  const customers = new Map((await db.execute(sql`SELECT no, name FROM vendors`)).map(r => [r.no as string, r.name as string]))
  const pl = await db.execute(sql`SELECT l.invoice_number, l.item_no, i.name AS item_name, i.unit, l.quantity, l.unit_price, l.total
    FROM purchase_invoice_lines l JOIN items i ON i.no = l.item_no ORDER BY l.invoice_number, l.seq`)
  const pu = await db.execute(sql`SELECT invoice_number, dp_number, amount FROM purchase_dp_usages`)
  const invoices = (await db.execute(sql`SELECT number, vendor_no, kind, bill_number, to_char(date,'YYYY-MM-DD') AS date, to_char(due_date,'YYYY-MM-DD') AS due, description, total FROM purchase_invoices`))
    .map(r => ({ number: r.number as string, customer: r.vendor_no as string, bill: r.bill_number as string, kind: (r.kind === 'DP' ? 'DP' : 'SI') as 'SI' | 'DP',
      dpUses: pu.filter(u => u.invoice_number === r.number).map(u => ({ dp: u.dp_number as string, amount: Number(u.amount) })), date: r.date as string, dueDate: r.due as string, description: r.description as string, total: Number(r.total),
      lines: pl.filter(l => l.invoice_number === r.number).map(l => ({ item: l.item_no as string, itemName: l.item_name as string, unit: l.unit as string, qty: Number(l.quantity), price: Number(l.unit_price), total: Number(l.total) })) }))
  const lines = await db.execute(sql`SELECT payment_number, invoice_number, amount FROM purchase_payment_lines`)
  const receipts = (await db.execute(sql`SELECT p.number, p.vendor_no, a.name AS bank_name, to_char(p.date,'YYYY-MM-DD') AS date, p.description, p.amount FROM purchase_payments p JOIN accounts a ON a.no = p.bank_no`))
    .map(r => ({ number: r.number as string, customer: r.vendor_no as string, bankName: r.bank_name as string, date: r.date as string, description: r.description as string, amount: Number(r.amount),
      payments: lines.filter(l => l.payment_number === r.number).map(l => ({ invoice: l.invoice_number as string, amount: Number(l.amount) })) }))
  return { customers, invoices, receipts, returns: await loadReturns(db, 'purchase'), labels: AP }
}

export async function loadInventory(db: Db): Promise<import('./inventory').InventoryData> {
  const items = (await db.execute(sql`SELECT no, name, unit FROM items WHERE type = 'INVENTORY'`)).map(r => ({ no: r.no as string, name: r.name as string, unit: r.unit as string }))
  const moves = (await db.execute(sql`
    SELECT m.item_no, to_char(m.date,'YYYY-MM-DD') AS date, m.doc_type, m.doc_number, m.quantity, m.value,
           COALESCE(v.name, c.name, cr.name, vr.name, '') AS party
    FROM stock_moves m
    LEFT JOIN purchase_invoices pi ON m.doc_type = 'PI' AND pi.number = m.doc_number LEFT JOIN vendors v ON v.no = pi.vendor_no
    LEFT JOIN sales_invoices si ON m.doc_type = 'SI' AND si.number = m.doc_number LEFT JOIN customers c ON c.no = si.customer_no
    LEFT JOIN sales_returns sr ON m.doc_type = 'SRT' AND sr.number = m.doc_number LEFT JOIN customers cr ON cr.no = sr.customer_no
    LEFT JOIN purchase_returns pr ON m.doc_type = 'PRT' AND pr.number = m.doc_number LEFT JOIN vendors vr ON vr.no = pr.vendor_no
    ORDER BY m.date, m.id`))
    .map(r => ({ item: r.item_no as string, date: r.date as string, docType: r.doc_type as string, docNumber: r.doc_number as string, party: r.party as string, quantity: Number(r.quantity), value: Number(r.value) }))
  return { items, moves }
}

/** FIFO cost of goods per sales invoice (cents), from stock_moves. */
export async function cogsByInvoice(db: Db): Promise<(invoice: string) => number> {
  const m = new Map((await db.execute(sql`SELECT doc_number, -SUM(value) AS cost FROM stock_moves WHERE doc_type = 'SI' GROUP BY doc_number`)).map(r => [r.doc_number as string, Number(r.cost)]))
  return n => m.get(n) ?? 0
}

export async function loadFixedAssets(db: Db): Promise<import('./fixed-assets').Asset[]> {
  const ex = await db.execute(sql`SELECT asset_number, name, to_char(date,'YYYY-MM-DD') AS date, amount FROM fixed_asset_expenditures ORDER BY asset_number, seq`)
  const dep = await db.execute(sql`SELECT d.asset_number, d.period, to_char(d.date,'YYYY-MM-DD') AS date, d.jv_number, p.number AS pe_number, d.amount
    FROM depreciations d JOIN period_ends p ON p.period = d.period ORDER BY d.asset_number, d.date`)
  return (await db.execute(sql`SELECT number, description, category, to_char(date,'YYYY-MM-DD') AS date, to_char(usage_date,'YYYY-MM-DD') AS usage, life_months, cost, expense_account, accumulated_account FROM fixed_assets`))
    .map(r => ({ number: r.number as string, description: r.description as string, category: r.category as string, date: r.date as string, usageDate: r.usage as string,
      lifeMonths: Number(r.life_months), cost: Number(r.cost), expenseAccount: r.expense_account as string, accumulatedAccount: r.accumulated_account as string,
      expenditures: ex.filter(e => e.asset_number === r.number).map(e => ({ name: e.name as string, date: e.date as string, amount: Number(e.amount) })),
      depreciations: dep.filter(d => d.asset_number === r.number).map(d => ({ period: d.period as string, date: d.date as string, jvNumber: d.jv_number as string, periodEndNumber: d.pe_number as string, amount: Number(d.amount) })) }))
}

async function loadReturns(db: Db, kind: 'sales' | 'purchase'): Promise<import('./receivables').Return[]> {
  const head = kind === 'sales'
    ? await db.execute(sql`SELECT number, customer_no AS party, invoice_number, to_char(date,'YYYY-MM-DD') AS date, description, total FROM sales_returns`)
    : await db.execute(sql`SELECT number, vendor_no AS party, invoice_number, to_char(date,'YYYY-MM-DD') AS date, description, total FROM purchase_returns`)
  const ls = kind === 'sales'
    ? await db.execute(sql`SELECT l.return_number, l.item_no, i.name, i.unit, l.quantity, l.unit_price, l.total FROM sales_return_lines l JOIN items i ON i.no = l.item_no ORDER BY l.return_number, l.seq`)
    : await db.execute(sql`SELECT l.return_number, l.item_no, i.name, i.unit, l.quantity, l.unit_price, l.total FROM purchase_return_lines l JOIN items i ON i.no = l.item_no ORDER BY l.return_number, l.seq`)
  return head.map(r => ({ number: r.number as string, customer: r.party as string, invoice: r.invoice_number as string, date: r.date as string, description: r.description as string, total: Number(r.total),
    lines: ls.filter(l => l.return_number === r.number).map(l => ({ item: l.item_no as string, itemName: l.name as string, unit: l.unit as string, qty: Number(l.quantity), price: Number(l.unit_price), total: Number(l.total) })) }))
}

/** Finance charts over calendar months [from, to], from our own Neraca / Laba-Rugi totals. */
export async function queryFinanceChart(db: Db, chart: 'net-worth' | 'liquidity' | 'roa' | 'roe' | 'revenue-vs-expense', from: string, to: string) {
  const { bsTotals, plTotals, netWorthChart, liquidityChart, returnOnAssetChart, returnOnEquityChart, revenueVsExpenseChart } = await import('./financial-ratios')
  const { accounts, balances, settings } = await loadLedger(db, to)
  const o = { showZeroBalance: true, showParentAccount: true }
  const ms = months(Number(from.slice(0, 4)), Number(from.slice(5, 7)), Number(to.slice(0, 4)), Number(to.slice(5, 7)))
  const ends = ms.map(m => bsTotals(balanceSheet(accounts, balances, settings, m.to, o)))
  const pls = ms.map(m => plTotals(profitLoss(accounts, balances, m.from, m.to, o)))
  const series = chart === 'net-worth' ? netWorthChart(ends) : chart === 'liquidity' ? liquidityChart(ends) : chart === 'roa' ? returnOnAssetChart(ends, pls)
    : chart === 'roe' ? returnOnEquityChart(ends, pls)
    : revenueVsExpenseChart(ms.map(m => { const l = profitLoss(accounts, balances, m.from, m.to, o), v = (k: string) => (l.find(x => x.label === k)?.amount ?? 0) / 100
      return { revenue: v('Jumlah Pendapatan') + v('Jumlah Pendapatan Non Operasional'), expense: v('Jumlah Beban Pokok Penjualan') + v('Jumlah Beban Operasional') + v('Jumlah Beban Non Operasional') } }))
  return { labels: ms.map(m => m.label), series }
}
