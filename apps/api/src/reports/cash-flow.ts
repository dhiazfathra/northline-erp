import { formatIdr, PROFIT_LOSS_TYPES, type AccountType, type DailyBalance, type TbAccount } from './trial-balance'
import type { Journal } from './general-ledger'

// Arus Kas: Tak Langsung, Rincian (Tak Langsung), Langsung — single period or one column per month.
// Rules in docs/reports/CashFlow*.md. Every builder returns rows of [label, ...one value per period].

export interface Period { from: string; to: string }
type Row = [string, ...number[]] | [string]

const dayBefore = (iso: string) => new Date(Date.parse(iso + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10)

class Ctx {
  type: Map<string, AccountType>
  name: Map<string, string>
  constructor(public accounts: TbAccount[], public balances: DailyBalance[], public periods: Period[]) {
    this.type = new Map(accounts.map(a => [a.no, a.type]))
    this.name = new Map(accounts.map(a => [a.no, a.name]))
  }
  /** −(D − C) per period for accounts matching `pick` (credit increases add cash). */
  cash(pick: (no: string) => boolean): number[] {
    return this.periods.map(p => this.balances.filter(b => pick(b.account) && b.date >= p.from && b.date <= p.to).reduce((s, b) => s + b.credit - b.debit, 0))
  }
  ofTypes = (types: AccountType[]) => this.cash(no => types.includes(this.type.get(no)!))
  /** One row per account of `types` that is non-zero in some period, by account number. */
  accountRows(types: AccountType[]): Row[] {
    return this.accounts.filter(a => types.includes(a.type)).sort((a, b) => (a.no < b.no ? -1 : 1))
      .map(a => [a.name, ...this.cash(no => no === a.no)] as Row).filter(r => r.slice(1).some(v => v !== 0))
  }
  /** Cash balance at the start of each period: balance before the first, then chained by each period's movement. */
  openingCash(): number[] {
    const isCash = (no: string) => this.type.get(no) === 'CASH_BANK'
    let bal = this.balances.filter(b => isCash(b.account) && b.date <= dayBefore(this.periods[0]!.from)).reduce((s, b) => s + b.debit - b.credit, 0)
    return this.cash(isCash).map(credMinusDeb => { const open = bal; bal -= credMinusDeb; return open })
  }
}

const add = (...xs: number[][]) => xs[0]!.map((_, i) => xs.reduce((s, x) => s + x[i]!, 0))
const sumRows = (rows: Row[], n: number) => add(new Array(n).fill(0), ...rows.map(r => r.slice(1) as number[]))
const r = (label: string, v: number[]): Row => [label, ...v]

function closing(c: Ctx, net: number[]): Row[] {
  const open = c.openingCash()
  return [r('Kas & Setara Kas di Awal period', open), r('Kas & Setara Kas di Akhir period', add(open, net))]
}

export function cashFlowIndirect(accounts: TbAccount[], balances: DailyBalance[], periods: Period[]): Row[] {
  const c = new Ctx(accounts, balances, periods)
  const ni = c.ofTypes([...PROFIT_LOSS_TYPES])
  const op: Row[] = [
    r('Tambah Akumulasi Penyusutan', c.ofTypes(['ACCUMULATED_DEPRECIATION'])),
    r('Tambah Utang Usaha', c.ofTypes(['ACCOUNT_PAYABLE'])),
    r('Tambah Liabilitas Jangka Pendek', c.ofTypes(['OTHER_CURRENT_LIABILITY'])),
    r('Kurang Piutang Usaha', c.ofTypes(['ACCOUNT_RECEIVABLE'])),
    r('Kurang Persediaan', c.ofTypes(['INVENTORY'])),
    r('Kurang Aset Lancar Lainnya', c.ofTypes(['OTHER_CURRENT_ASSET'])),
  ]
  const inv: Row[] = [r('Kurang Aset Tetap', c.ofTypes(['FIXED_ASSET'])), r('Kurang Aset Lainnya', c.ofTypes(['OTHER_ASSET']))]
  const fin: Row[] = [r('Tambah Liabilitas Jangka Panjang', c.ofTypes(['LONG_TERM_LIABILITY'])), r('Tambah Modal', c.ofTypes(['EQUITY']))]
  const n = periods.length, tOp = add(ni, sumRows(op, n)), tInv = sumRows(inv, n), tFin = sumRows(fin, n), net = add(tOp, tInv, tFin)
  return [
    ['Aktifitas Operasi'], r('Laba/Rugi', ni), ...op, r('Total Aktifitas Operasi', tOp),
    ['Investasi'], ...inv, r('Total Investasi', tInv),
    ['Pendanaan'], ...fin, r('Total Pendanaan', tFin),
    r('Total dari Arus Kas Bersih yang digunakan (dipakai) di periode ini', net), ...closing(c, net),
  ]
}

/** Rincian Arus Kas (Tak Langsung): the indirect method with account rows instead of type rows. */
export function cashFlowIndirectDetail(accounts: TbAccount[], balances: DailyBalance[], periods: Period[]): Row[] {
  const c = new Ctx(accounts, balances, periods), n = periods.length
  const ni = c.ofTypes([...PROFIT_LOSS_TYPES])
  const dep = c.accountRows(['ACCUMULATED_DEPRECIATION'])
  const plus = c.accountRows(['ACCOUNT_PAYABLE', 'OTHER_CURRENT_LIABILITY'])
  const minus = c.accountRows(['ACCOUNT_RECEIVABLE', 'INVENTORY', 'OTHER_CURRENT_ASSET'])
  const inv = c.accountRows(['FIXED_ASSET', 'OTHER_ASSET'])
  const fin = c.accountRows(['LONG_TERM_LIABILITY', 'EQUITY'])
  // shortcut: "Selain Penyusutan" blocks print only when they have accounts — the fixture never shows an empty one; verify with sales data.
  const selain = (rows: Row[]): Row[] => (rows.length ? [['Selain Penyusutan'], ...rows, r('Total Selain Penyusutan', sumRows(rows, n))] : [])
  const tPlus = add(sumRows(dep, n), sumRows(plus, n)), tMinus = sumRows(minus, n)
  const tOp = add(ni, tPlus, tMinus), tInv = sumRows(inv, n), tFin = sumRows(fin, n), net = add(tOp, tInv, tFin)
  return [
    ['Aktifitas Operasi'], r('Laba/Rugi', ni),
    ['Tambah'], ['Akumulasi Penyusutan'], ...dep, r('Total Akumulasi Penyusutan', sumRows(dep, n)), ...selain(plus), r('Total Tambah', tPlus),
    ['Kurang'], ...selain(minus), r('Total Kurang', tMinus),
    r('Total Aktifitas Operasi', tOp),
    ['Investasi'], ['Kurang'], ...inv, r('Total Kurang', tInv), r('Total Investasi', tInv),
    ['Pendanaan'], ['Tambah'], ...fin, r('Total Tambah', tFin), r('Total Pendanaan', tFin),
    r('Total dari Arus Kas Bersih yang digunakan (dipakai) di periode ini', net), ...closing(c, net),
  ]
}

type Group = 'sales' | 'purchases' | 'income' | 'spend' | 'opAsset' | 'opLiab' | 'invest' | 'finance'
const GROUP: Record<AccountType, Group | null> = {
  CASH_BANK: null, ACCOUNT_RECEIVABLE: 'sales', ACCOUNT_PAYABLE: 'purchases', REVENUE: 'income', OTHER_INCOME: 'income',
  COGS: 'spend', EXPENSE: 'spend', OTHER_EXPENSE: 'spend', INVENTORY: 'opAsset', OTHER_CURRENT_ASSET: 'opAsset', ACCUMULATED_DEPRECIATION: 'opAsset',
  OTHER_CURRENT_LIABILITY: 'opLiab', FIXED_ASSET: 'invest', OTHER_ASSET: 'invest', LONG_TERM_LIABILITY: 'finance', EQUITY: 'finance',
}

/**
 * Direct method: only journals with a cash line count; each non-cash line contributes −(D − C) to its account.
 * Accruals without a cash line never appear.
 */
export function cashFlowDirect(accounts: TbAccount[], balances: DailyBalance[], journals: Journal[], periods: Period[]): Row[] {
  const c = new Ctx(accounts, balances, periods), n = periods.length
  const flow = new Map<string, number[]>()
  for (const j of journals) {
    const i = periods.findIndex(p => j.date >= p.from && j.date <= p.to)
    if (i < 0 || !j.lines.some(l => c.type.get(l.account) === 'CASH_BANK')) continue
    for (const l of j.lines) {
      if (c.type.get(l.account) === 'CASH_BANK') continue
      const v = flow.get(l.account) ?? new Array(n).fill(0)
      v[i] += l.credit - l.debit
      flow.set(l.account, v)
    }
  }
  const rows = (g: Group): Row[] => [...flow].filter(([no]) => GROUP[c.type.get(no)!] === g).sort(([a], [b]) => (a < b ? -1 : 1)).map(([no, v]) => r(c.name.get(no)!, v))
  const total = (g: Group) => sumRows(rows(g), n)
  const opBefore = add(total('sales'), total('income'), total('purchases'), total('spend'))
  const tOp = add(opBefore, total('opAsset'), total('opLiab')), net = add(tOp, total('invest'), total('finance'))
  return [
    ['Aktifitas Operasi'],
    r('Kas dari Penjualan', total('sales')), ...rows('income'),
    r('Kas untuk Pembelian', total('purchases')), ...rows('spend'),
    r('Laba(Rugi) Operasi sebelum berubah di Operasi Aset dan Liabilitas', opBefore),
    ['Berkurang(Bertambah) pada Operasi Aset'], ...rows('opAsset'), r('Total Berkurang(Bertambah) pada Operasi Aset', total('opAsset')),
    ['Berkurang(Bertambah) pada Operasi Liabilitas'], ...rows('opLiab'), r('Total Berkurang(Bertambah) pada Operasi Liabilitas', total('opLiab')),
    r('Total Kas bersih (dipakai)/ dihasilkan oleh Aktivitas Operasi', tOp),
    ['Aktifitas Investasi'], ...rows('invest'), r('Total Kas bersih yg dihasilkan / (dipakai) oleh Aktivitas Investasi', total('invest')),
    ['Aktifitas Pendanaan'], ...rows('finance'), r('Total Kas bersih yg dihasilkan / (dipakai) oleh Aktivitas Pendanaan', total('finance')),
    r('Kas bersih dihasilkan oleh / (dipakai) di Period ini', net), ...closing(c, net),
  ]
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
/** Printed table: header (`Nilai`, or `Des 2030 | Jan 2031 …` for multi-period) then formatted rows. */
export function formatCashFlow(rows: Row[], periods: Period[]): string[][] {
  const head = periods.length === 1 ? ['Keterangan', 'Nilai'] : ['Keterangan', ...periods.map(p => `${MON[Number(p.from.slice(5, 7)) - 1]} ${p.from.slice(0, 4)}`)]
  return [head, ...rows.map(([l, ...v]) => [l, ...(v as number[]).map(formatIdr)])]
}

const MONTH_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
/** Sandbox-wide inputs the ERP does not hold: opening cash and cheque clearings per column (docs/reports/CashProjectionReport.md). */
export interface CashProjectionBase { opening: number; chequesIn: number[]; chequesOut: number[] }
/**
 * Proyeksi Kas per Bulan: five columns from today (today..end of month, then four calendar months). Piutang / Utang Jatuh
 * Tempo = open invoice balances bucketed by due date; each column's Saldo Kas is the previous column's
 * Perkiraan Lebih/Kurang Kas = Saldo + Total Sumber - Total Penggunaan.
 */
// shortcut: balances already overdue before today, expense and salary schedules are not captured (0 in the fixture).
export function cashProjection(today: string, base: CashProjectionBase, receivables: { due: string; owing: number }[], payables: { due: string; owing: number }[]): string[][] {
  const [y, m, dd] = today.split('-').map(Number) as [number, number, number]
  const cols = Array.from({ length: 5 }, (_, i) => {
    const yy = y + Math.floor((m - 1 + i) / 12), mm = (m - 1 + i) % 12 + 1, last = new Date(Date.UTC(yy, mm, 0)).getUTCDate()
    const ym = `${yy}-${String(mm).padStart(2, '0')}`
    return { from: i === 0 ? today : `${ym}-01`, to: `${ym}-${String(last).padStart(2, '0')}`, label: i === 0 ? `${dd}-${last} ${MONTH_ID[mm - 1]} ${yy}` : `${MONTH_ID[mm - 1]} ${yy}` }
  })
  const bucket = (xs: { due: string; owing: number }[]) => cols.map(c => xs.filter(x => x.owing && x.due >= c.from && x.due <= c.to).reduce((s, x) => s + x.owing, 0))
  const piutang = bucket(receivables), utang = bucket(payables)
  const zero = cols.map(() => 0), saldo: number[] = [], akhir: number[] = []
  const sumber = cols.map((_, i) => piutang[i]! + base.chequesIn[i]!), guna = cols.map((_, i) => utang[i]! + base.chequesOut[i]!)
  cols.forEach((_, i) => { saldo.push(i ? akhir[i - 1]! : base.opening); akhir.push(saldo[i]! + sumber[i]! - guna[i]!) })
  const f = (xs: number[]) => xs.map(formatIdr)
  return [['Proyeksi Kas per Bulan'], ['Keterangan', ...cols.map(c => c.label)],
    [`Saldo Kas per ${dd} ${MONTH_ID[m - 1]} ${y}`, ...f(saldo)],
    ['Sumber Pendapatan'], ['Piutang Jatuh Tempo', ...f(piutang)], ['Pencairan Cek Jatuh Tempo', ...f(base.chequesIn)], ['Total Sumber Pendapatan', ...f(sumber)],
    ['Penggunaan Kas'], ['Utang Jatuh Tempo', ...f(utang)], ['Cek Mundur Jatuh Tempo', ...f(base.chequesOut)], ['Pembayaran Beban Jatuh Tempo', ...f(zero)], ['Pembayaran Gaji Karyawan', ...f(zero)],
    ['Total Penggunaan Kas', ...f(guna)], ['Perkiraan Lebih/Kurang Kas', ...f(akhir)]]
}

/**
 * Proyeksi Ketersediaan Kas (chart): points where projected cash changes. Future points are open receivables (+) and
 * payables (-) by due date in [from, to], the same items Proyeksi Kas per Bulan buckets by month (ADR-0011).
 */
export function cashAvailabilityEvents(receivables: { due: string; owing: number }[], payables: { due: string; owing: number }[], from: string, to: string) {
  const m = new Map<string, number>()
  for (const [xs, sign] of [[receivables, 1], [payables, -1]] as const)
    for (const x of xs) if (x.owing && x.due >= from && x.due <= to) m.set(x.due, (m.get(x.due) ?? 0) + sign * x.owing)
  return [...m].sort(([a], [b]) => a.localeCompare(b)).map(([date, delta]) => ({ date, delta }))
}
