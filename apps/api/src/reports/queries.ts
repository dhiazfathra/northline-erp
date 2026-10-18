import { sql } from 'drizzle-orm'
import type { BalanceSheetQuery, TrialBalanceQuery } from '@northline/schemas/ledger-es'
import type { Db } from '../db'
import { trialBalance, type AccountType } from './trial-balance'
import { balanceSheet, profitLoss } from './financial-statements'
import { allJournals, glDetail, glHistory, glSummary, journalList, type Journal } from './general-ledger'

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

async function loadJournals(db: Db, from: string, to: string): Promise<Journal[]> {
  const rows = await db.execute(sql`
    SELECT j.journal_id, j.number, to_char(j.date, 'YYYY-MM-DD') AS date, j.description, l.account_no, l.debit, l.credit, l.memo
    FROM journals j JOIN journal_lines l USING (journal_id)
    WHERE j.date BETWEEN ${from} AND ${to} ORDER BY j.date, j.number, l.line_no`)
  const byId = new Map<string, Journal>()
  for (const r of rows) {
    const id = r.journal_id as string
    if (!byId.has(id)) byId.set(id, { number: r.number as string, date: r.date as string, description: r.description as string, lines: [] })
    byId.get(id)!.lines.push({ account: r.account_no as string, debit: Number(r.debit), credit: Number(r.credit), memo: r.memo as string | null })
  }
  return [...byId.values()]
}

export type GlReport = 'journal-list' | 'all-journals' | 'history' | 'summary' | 'detail'
export async function queryGeneralLedger(db: Db, report: GlReport, q: TrialBalanceQuery): Promise<string[][]> {
  const { accounts, balances, settings } = await loadLedger(db, q.to)
  if (report === 'summary') return glSummary(accounts, balances, settings, q.from, q.to, q.showZeroBalance)
  const journals = await loadJournals(db, q.from, q.to)
  switch (report) {
    case 'journal-list': return journalList(journals)
    case 'all-journals': return allJournals(journals, accounts)
    case 'history': return glHistory(journals, accounts)
    case 'detail': return glDetail(accounts, balances, settings, journals, q.from, q.to)
  }
}
