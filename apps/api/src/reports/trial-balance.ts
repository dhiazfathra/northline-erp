import type { TrialBalanceQuery, TrialBalanceRow } from '@northline/schemas/ledger-es'

// Neraca Percobaan as specified in docs/reports/TrialBalanceReport.md (rule numbers in comments).

export type AccountType =
  | 'CASH_BANK' | 'ACCOUNT_RECEIVABLE' | 'INVENTORY' | 'OTHER_CURRENT_ASSET' | 'FIXED_ASSET' | 'ACCUMULATED_DEPRECIATION'
  | 'OTHER_ASSET' | 'ACCOUNT_PAYABLE' | 'OTHER_CURRENT_LIABILITY' | 'LONG_TERM_LIABILITY' | 'EQUITY'
  | 'REVENUE' | 'COGS' | 'EXPENSE' | 'OTHER_INCOME' | 'OTHER_EXPENSE'

export const PROFIT_LOSS_TYPES: ReadonlySet<AccountType> = new Set(['REVENUE', 'COGS', 'EXPENSE', 'OTHER_INCOME', 'OTHER_EXPENSE'])

export interface TbAccount { no: string; name: string; type: AccountType; parentNo: string | null }
/** Debit/credit cents per account per day (the `account_daily_balances` read model). */
export interface DailyBalance { account: string; date: string; debit: number; credit: number }
export interface LedgerSettings { retainedEarningsAccount: string; fiscalYearStartMonth: number }

export function fiscalYearStart(date: string, startMonth: number): string {
  const y = Number(date.slice(0, 4)), m = Number(date.slice(5, 7))
  return `${m < startMonth ? y - 1 : y}-${String(startMonth).padStart(2, '0')}-01`
}

interface Sums { opening: number; debit: number; credit: number }

export function trialBalance(
  accounts: TbAccount[],
  balances: DailyBalance[],
  settings: LedgerSettings,
  q: TrialBalanceQuery,
): TrialBalanceRow[] {
  const fyStart = fiscalYearStart(q.from, settings.fiscalYearStartMonth)
  const type = new Map(accounts.map(a => [a.no, a.type]))
  const own = new Map<string, Sums>(accounts.map(a => [a.no, { opening: 0, debit: 0, credit: 0 }]))

  for (const b of balances) {
    const s = own.get(b.account)
    if (!s) throw new Error(`Unknown account ${b.account}`)
    const net = b.debit - b.credit
    const pl = PROFIT_LOSS_TYPES.has(type.get(b.account)!)
    if (b.date >= q.from && b.date <= q.to) { s.debit += b.debit; s.credit += b.credit } // rule 2
    else if (b.date < q.from) {
      if (!pl) s.opening += net // rule 3
      else if (b.date >= fyStart) s.opening += net // rule 4
      else { // rule 5: closed fiscal years roll into retained earnings
        const re = own.get(settings.retainedEarningsAccount)
        if (!re) throw new Error(`Retained earnings account ${settings.retainedEarningsAccount} missing`)
        re.opening += net
      }
    }
  }

  const children = new Map<string | null, TbAccount[]>()
  for (const a of accounts) {
    const k = a.parentNo ?? null
    children.set(k, [...(children.get(k) ?? []), a])
  }
  for (const list of children.values()) list.sort((a, b) => (a.no < b.no ? -1 : a.no > b.no ? 1 : 0)) // rule 9

  const rows: TrialBalanceRow[] = []
  const walk = (a: TbAccount, depth: number): Sums => {
    const kids = children.get(a.no) ?? []
    const at = rows.length
    const total = { ...own.get(a.no)! }
    for (const k of kids) {
      const s = walk(k, depth + 1)
      total.opening += s.opening; total.debit += s.debit; total.credit += s.credit // rule 8
    }
    const isParent = kids.length > 0
    const hidden = (!q.showZeroBalance && total.opening === 0 && total.debit === 0 && total.credit === 0) || (isParent && !q.showParentAccount)
    if (!hidden) rows.splice(at, 0, toRow(a, depth, isParent, total))
    return total
  }
  for (const root of children.get(null) ?? []) walk(root, 0)
  return rows
}

function toRow(a: TbAccount, depth: number, isParent: boolean, s: Sums): TrialBalanceRow {
  const closing = s.opening + s.debit - s.credit // rule 6
  return {
    no: a.no, name: a.name, depth, isParent,
    openingDebit: Math.max(s.opening, 0), openingCredit: Math.max(-s.opening, 0), // rule 1
    debit: s.debit, credit: s.credit,
    closingDebit: Math.max(closing, 0), closingCredit: Math.max(-closing, 0),
  }
}

/** Accurate's id-ID number style: `1.250.000,5`, `0` (rule 10). */
export function formatIdr(cents: number): string {
  const neg = cents < 0, abs = Math.abs(cents)
  const int = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const frac = String(abs % 100).padStart(2, '0').replace(/0+$/, '')
  return (neg ? '-' : '') + int + (frac ? ',' + frac : '')
}

export const formatRow = (r: TrialBalanceRow): string[] => [
  r.no, r.name,
  ...[r.openingDebit, r.openingCredit, r.debit, r.credit, r.closingDebit, r.closingCredit].map(formatIdr),
]
