import { fiscalYearStart, formatIdr, PROFIT_LOSS_TYPES, type AccountType, type DailyBalance, type LedgerSettings, type TbAccount } from './trial-balance'

// Laba/Rugi (Standar) and Neraca (Standar); rules in docs/reports/ProfitLossStandardReport.md and BalanceSheetStandardReport.md.

export interface StatementLine { label: string; amount?: number; kind: 'heading' | 'account' | 'total' }
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
    if (show) lines.splice(at, 0, { label: a.name, amount: sum, kind: 'account' })
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
/** Column header: `1 - 28 Feb 2031`, `1 Jan - 28 Feb 2031`, `1 Des 2030 - 31 Jan 2031`. */
export function periodLabel(from: string, to: string): string {
  const [fy, fm, fd] = from.split('-').map(Number) as [number, number, number]
  const [ty, tm, td] = to.split('-').map(Number) as [number, number, number]
  const end = `${td} ${MONTHS[tm - 1]} ${ty}`
  if (fy !== ty) return `${fd} ${MONTHS[fm - 1]} ${fy} - ${end}`
  if (fm !== tm) return `${fd} ${MONTHS[fm - 1]} - ${end}`
  return `${fd} - ${end}`
}
