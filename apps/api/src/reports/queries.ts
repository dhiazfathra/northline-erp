import { sql } from 'drizzle-orm'
import type { BalanceSheetQuery, TrialBalanceQuery } from '@northline/schemas/ledger-es'
import type { Db } from '../db'
import { trialBalance, type AccountType } from './trial-balance'
import { balanceSheet, profitLoss } from './financial-statements'

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
