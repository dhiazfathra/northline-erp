import { fiscalYearStart, formatIdr, PROFIT_LOSS_TYPES, type AccountType, type DailyBalance, type LedgerSettings, type TbAccount } from './trial-balance'

// Laba/Rugi (Standar) and Neraca (Standar); rules in docs/reports/ProfitLossStandardReport.md and BalanceSheetStandardReport.md.

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

/** `account` is the account number on account lines, so callers can match the same account across periods (names can repeat). */
export interface StatementLine { label: string; amount?: number; kind: 'heading' | 'account' | 'total'; account?: string }
export interface StatementOptions { showZeroBalance: boolean; showParentAccount: boolean }

/** Natural-side sign: credit-normal types report C−D, the rest D−C. */
const CREDIT_NORMAL: ReadonlySet<AccountType> = new Set([
  'ACCOUNT_PAYABLE', 'OTHER_CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'EQUITY', 'REVENUE', 'OTHER_INCOME', 'ACCUMULATED_DEPRECIATION',
])
const natural = (type: AccountType, net: number) => (CREDIT_NORMAL.has(type) ? -net : net)

type Net = Map<string, number> // account → debit − credit

function netBetween(balances: DailyBalance[], from: string | null, to: string): Net {
  const m: Net = new Map()
  for (const b of balances) if ((from === null || b.date >= from) && b.date <= to) m.set(b.account, (m.get(b.account) ?? 0) + b.debit - b.credit)
  return m
}

/** Accounts of `types` as lines in tree order; returns the lines and the sum over leaf accounts. */
function accountLines(accounts: TbAccount[], net: Net, types: AccountType[], o: StatementOptions): { lines: StatementLine[]; total: number } {
  const set = new Set(types)
  const kids = new Map<string | null, TbAccount[]>()
  for (const a of accounts) kids.set(a.parentNo, [...(kids.get(a.parentNo) ?? []), a])
  for (const l of kids.values()) l.sort((a, b) => (a.no < b.no ? -1 : a.no > b.no ? 1 : 0))
  const lines: StatementLine[] = []
  let total = 0
  const walk = (a: TbAccount): number => {
    const children = kids.get(a.no) ?? []
    const at = lines.length
    let sum = natural(a.type, net.get(a.no) ?? 0)
    if (!children.length && set.has(a.type)) total += sum
    for (const c of children) sum += walk(c)
    const show = set.has(a.type) && (o.showZeroBalance || sum !== 0) && (!children.length || o.showParentAccount)
    if (show) lines.splice(at, 0, { label: a.name, amount: sum, kind: 'account', account: a.no })
    return sum
  }
  for (const r of kids.get(null) ?? []) walk(r)
  return { lines, total }
}

const h = (label: string): StatementLine => ({ label, kind: 'heading' })
const t = (label: string, amount: number): StatementLine => ({ label, amount, kind: 'total' })

export function profitLoss(accounts: TbAccount[], balances: DailyBalance[], from: string, to: string, o: StatementOptions): StatementLine[] {
  const net = netBetween(balances, from, to)
  const sec = (types: AccountType[]) => accountLines(accounts, net, types, o)
  const rev = sec(['REVENUE']), cogs = sec(['COGS']), opex = sec(['EXPENSE']), oi = sec(['OTHER_INCOME']), oe = sec(['OTHER_EXPENSE'])
  const gross = rev.total - cogs.total, operating = gross - opex.total, nonOp = oi.total - oe.total
  return [
    h('PENDAPATAN'), ...rev.lines, t('Jumlah Pendapatan', rev.total),
    h('BEBAN POKOK PENJUALAN'), ...cogs.lines, t('Jumlah Beban Pokok Penjualan', cogs.total),
    t('LABA KOTOR', gross),
    h('BEBAN OPERASIONAL'), ...opex.lines, t('Jumlah Beban Operasional', opex.total),
    t('PENDAPATAN OPERASIONAL', operating),
    h('PENDAPATAN DAN BEBAN NON OPERASIONAL'),
    h('Pendapatan Non Operasional'), ...oi.lines, t('Jumlah Pendapatan Non Operasional', oi.total),
    h('Beban Non Operasional'), ...oe.lines, t('Jumlah Beban Non Operasional', oe.total),
    t('Jumlah Pendapatan dan Beban Non Operasional', nonOp),
    t('LABA BERSIH', operating + nonOp),
  ]
}

export function balanceSheet(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, asOf: string, o: StatementOptions): StatementLine[] {
  const fy = fiscalYearStart(asOf, settings.fiscalYearStartMonth)
  const type = new Map(accounts.map(a => [a.no, a.type]))
  const net = netBetween(balances.filter(b => !PROFIT_LOSS_TYPES.has(type.get(b.account)!)), null, asOf)
  // Closed fiscal years roll into retained earnings; the current year shows as "Laba Tahun Ini".
  const pl = balances.filter(b => PROFIT_LOSS_TYPES.has(type.get(b.account)!) && b.date <= asOf)
  const closed = pl.filter(b => b.date < fy).reduce((s, b) => s + b.debit - b.credit, 0)
  const currentYear = -pl.filter(b => b.date >= fy).reduce((s, b) => s + b.debit - b.credit, 0)
  net.set(settings.retainedEarningsAccount, (net.get(settings.retainedEarningsAccount) ?? 0) + closed)

  const sec = (types: AccountType[]) => accountLines(accounts, net, types, o)
  const group = (title: string, types: AccountType[], totalLabel: string) => {
    const s = sec(types)
    return { lines: [h(title), ...s.lines, t(totalLabel, s.total)], total: s.total }
  }
  const cash = group('Kas dan Setara Kas', ['CASH_BANK'], 'Jumlah Kas dan Setara Kas')
  const ar = group('Piutang Usaha', ['ACCOUNT_RECEIVABLE'], 'Jumlah Piutang Usaha')
  const inv = group('Persediaan', ['INVENTORY'], 'Jumlah Persediaan')
  const oca = group('Aset Lancar Lainnya', ['OTHER_CURRENT_ASSET'], 'Jumlah Aset Lancar Lainnya')
  const fa = group('Nilai Histori', ['FIXED_ASSET'], 'Jumlah Nilai Histori')
  // Accumulated depreciation is credit-normal but reduces assets.
  const dep = group('Akumulasi Penyusutan', ['ACCUMULATED_DEPRECIATION'], 'Jumlah Akumulasi Penyusutan')
  const oa = group('Aset Lainnya', ['OTHER_ASSET'], 'Jumlah Aset Lainnya')
  const ap = group('Utang Usaha', ['ACCOUNT_PAYABLE'], 'Jumlah Utang')
  const ocl = group('Kewajiban Jangka Pendek Lainnya', ['OTHER_CURRENT_LIABILITY'], 'Jumlah Kewajiban Jangka Pendek Lainnya')
  const ltl = sec(['LONG_TERM_LIABILITY'])
  const eq = sec(['EQUITY'])

  const current = cash.total + ar.total + inv.total + oca.total
  const nonCurrent = fa.total - dep.total
  const assets = current + nonCurrent + oa.total
  const shortTerm = ap.total + ocl.total
  const liabilities = shortTerm + ltl.total
  const equity = eq.total + currentYear
  return [
    h('ASET'), h('ASET LANCAR'), ...cash.lines, ...ar.lines, ...inv.lines, ...oca.lines, t('Jumlah Aset Lancar', current),
    h('ASET TIDAK LANCAR'), ...fa.lines, ...dep.lines, t('Jumlah Aset Tidak Lancar', nonCurrent),
    ...oa.lines, t('JUMLAH ASET', assets),
    h('LIABILITAS DAN EKUITAS'), h('LIABILITAS'), h('LIABILITAS JANGKA PENDEK'), ...ap.lines, ...ocl.lines, t('Jumlah Kewajiban Jangka Pendek', shortTerm),
    h('LIABILITAS JANGKA PANJANG'), ...ltl.lines, t('Jumlah Kewajiban Jangka Panjang', ltl.total), t('Jumlah Kewajiban', liabilities),
    h('EKUITAS'), ...eq.lines, { label: 'Laba Tahun Ini', amount: currentYear, kind: 'account' }, t('Jumlah Ekuitas', equity),
    t('JUMLAH LIABILITAS DAN EKUITAS', liabilities + equity),
  ]
}

export const formatLine = (l: StatementLine): string[] => (l.amount === undefined ? [l.label] : [l.label, formatIdr(l.amount)])

/** Column header: `1 - 28 Feb 2031`, `1 Jan - 28 Feb 2031`, `1 Des 2030 - 31 Jan 2031`. */
export function periodLabel(from: string, to: string): string {
  const [fy, fm, fd] = from.split('-').map(Number) as [number, number, number]
  const [ty, tm, td] = to.split('-').map(Number) as [number, number, number]
  const end = `${td} ${MONTHS[tm - 1]} ${ty}`
  if (fy !== ty) return `${fd} ${MONTHS[fm - 1]} ${fy} - ${end}`
  if (fm !== tm) return `${fd} ${MONTHS[fm - 1]} - ${end}`
  return `${fd} - ${end}`
}

// ---- multi-column variants: the single-period statement per column, merged line by line ----

export interface MultiLine { label: string; kind: StatementLine['kind']; amounts: number[] }

/** Builds each column with zero rows kept (so lines align), then hides account rows that are zero in every column. */
export function mergeColumns(columns: StatementLine[][], o: StatementOptions, total = false): MultiLine[] {
  const out = columns[0]!.map((l, i) => {
    const amounts = l.amount === undefined ? [] : columns.map(c => c[i]!.amount!)
    return { label: l.label, kind: l.kind, amounts: total && amounts.length ? [...amounts, amounts.reduce((a, b) => a + b, 0)] : amounts }
  })
  return out.filter(l => l.kind !== 'account' || o.showZeroBalance || l.amounts.some(a => a !== 0) || l.label === 'Laba Tahun Ini')
}

const monthEnd = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
const iso = (y: number, m: number, d = 1) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export function months(startYear: number, startMonth: number, endYear: number, endMonth: number) {
  const out: { from: string; to: string; label: string }[] = []
  for (let y = startYear, m = startMonth; y < endYear || (y === endYear && m <= endMonth); m === 12 ? (y++, (m = 1)) : m++)
    out.push({ from: iso(y, m), to: monthEnd(y, m), label: `${MONTHS[m - 1]} ${y}` })
  return out
}

export function profitLossColumns(accounts: TbAccount[], balances: DailyBalance[], periods: { from: string; to: string }[], o: StatementOptions) {
  return mergeColumns(periods.map(p => profitLoss(accounts, balances, p.from, p.to, { ...o, showZeroBalance: true })), o, true)
}

export function balanceSheetColumns(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, dates: string[], o: StatementOptions) {
  return mergeColumns(dates.map(d => balanceSheet(accounts, balances, settings, d, { ...o, showZeroBalance: true })), o)
}

/** Perbandingan Periode: base, compare, variance (compare − base) and % of |base| (100 % when base is 0 and variance is not). */
export function compareColumns(base: StatementLine[], cmp: StatementLine[], o: StatementOptions): (MultiLine & { pct: (number | null)[] })[] {
  return mergeColumns([base, cmp], o).map(l => {
    if (!l.amounts.length) return { ...l, pct: [] }
    const [a, b] = l.amounts as [number, number]
    const v = b - a
    return { ...l, amounts: [a, b, v], pct: [a === 0 ? (v === 0 ? 0 : 100) : Math.round((v / Math.abs(a)) * 10_000) / 100] }
  })
}

export const formatMulti = (l: MultiLine & { pct?: (number | null)[] }): string[] =>
  [l.label, ...l.amounts.map(formatIdr), ...(l.pct ?? []).map(p => `${String(p).replace('.', ',')} %`)]

/** Kuartal columns of a calendar year (fiscal quarters unverified). */
export const quarters = (y: number) => [[1, 3], [4, 6], [7, 9], [10, 12]].map(([a, b]) => ({
  from: `${y}-${String(a).padStart(2, '0')}-01`, to: new Date(Date.UTC(y, b!, 0)).toISOString().slice(0, 10), label: `${MONTHS[a! - 1]} - ${MONTHS[b! - 1]}`,
}))

/** Neraca (Perbandingan Periode) column headers use English month abbreviations, unlike every other date in Accurate's reports. */
const EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const perDateEn = (iso: string) => `Per ${Number(iso.slice(8))} ${EN[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`

/**
 * Neraca (Induk Skontro): the standard Neraca rows in two columns, ASET on the left and LIABILITAS DAN EKUITAS on the
 * right, zipped row by row. Each side keeps Accurate's blank spacer rows (after a "Jumlah ..." row unless the next row is
 * another "Jumlah ..."), which decide the pairing; rows blank on both sides drop out (docs/reports/BalanceSheetParentScontroReport.md).
 */
export function skontro(standardRows: string[][]): string[][] {
  const isTotal = (r?: string[]) => !!r && /^jumlah /i.test(r[0] ?? '')
  const spaced = (rows: string[][]) => rows.flatMap((r, i) => (isTotal(r) && !isTotal(rows[i + 1]) ? [r, []] : [r]))
  const split = standardRows.findIndex(r => r[0] === 'LIABILITAS DAN EKUITAS')
  const left = spaced(standardRows.slice(standardRows.findIndex(r => r[0] === 'ASET'), split)), right = spaced(standardRows.slice(split))
  return Array.from({ length: Math.max(left.length, right.length) }, (_, i) => [...(left[i] ?? []), ...(right[i] ?? [])]).filter(r => r.length)
}

/**
 * Grafik Perbandingan Nilai Akun (unlabeled line chart, ADR-0011): one point per month with profit-and-loss activity,
 * value = sum over revenue/expense accounts of |net movement in the month| (Feb 2031: revenue 2.000.000 + expense
 * 1.000.000 = 3.000.000). Same movements the Laba/Rugi reports verify.
 */
// shortcut: inferred from the default (no account selection) over four months of NL-T1 data; an account filter is not captured.
export function accountValueCompareChart(accounts: TbAccount[], balances: DailyBalance[], from: string, to: string) {
  const pl = new Set(accounts.filter(a => PROFIT_LOSS_TYPES.has(a.type)).map(a => a.no))
  const net = new Map<string, number>()
  for (const b of balances.filter(b => pl.has(b.account) && b.date >= from && b.date <= to)) {
    const k = `${b.date.slice(0, 7)}|${b.account}`
    net.set(k, (net.get(k) ?? 0) + b.debit - b.credit)
  }
  const month = new Map<string, number>()
  for (const [k, v] of net) month.set(k.slice(0, 7), (month.get(k.slice(0, 7)) ?? 0) + Math.abs(v))
  return [...month].filter(([, v]) => v).sort().map(([m, value]) => ({ month: `${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`, value }))
}
