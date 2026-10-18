import { formatIdr, PROFIT_LOSS_TYPES, type AccountType, type DailyBalance, type TbAccount } from './trial-balance'
import type { Journal } from './general-ledger'

// Arus Kas (Tak Langsung / Langsung); rules in docs/reports/CashFlowIndirectReport.md and CashFlowDirectReport.md.

const sumBy = (balances: DailyBalance[], type: Map<string, AccountType>, types: AccountType[], from: string | null, to: string, sign: 1 | -1) =>
  balances.filter(b => types.includes(type.get(b.account)!) && (from === null || b.date >= from) && b.date <= to)
    .reduce((s, b) => s + sign * (b.debit - b.credit), 0)

const dayBefore = (iso: string) => new Date(Date.parse(iso + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10)

export function cashFlowIndirect(accounts: TbAccount[], balances: DailyBalance[], from: string, to: string): string[][] {
  const type = new Map(accounts.map(a => [a.no, a.type]))
  const mv = (types: AccountType[], sign: 1 | -1) => sumBy(balances, type, types, from, to, sign)
  const ni = mv([...PROFIT_LOSS_TYPES], -1)
  // "Tambah" rows: credit-side increases add cash; "Kurang" rows: debit-side increases use cash. Both are −(D − C).
  const op = [
    ['Tambah Akumulasi Penyusutan', mv(['ACCUMULATED_DEPRECIATION'], -1)],
    ['Tambah Utang Usaha', mv(['ACCOUNT_PAYABLE'], -1)],
    ['Tambah Liabilitas Jangka Pendek', mv(['OTHER_CURRENT_LIABILITY'], -1)],
    ['Kurang Piutang Usaha', mv(['ACCOUNT_RECEIVABLE'], -1)],
    ['Kurang Persediaan', mv(['INVENTORY'], -1)],
    ['Kurang Aset Lancar Lainnya', mv(['OTHER_CURRENT_ASSET'], -1)],
  ] as const
  const inv = [['Kurang Aset Tetap', mv(['FIXED_ASSET'], -1)], ['Kurang Aset Lainnya', mv(['OTHER_ASSET'], -1)]] as const
  const fin = [['Tambah Liabilitas Jangka Panjang', mv(['LONG_TERM_LIABILITY'], -1)], ['Tambah Modal', mv(['EQUITY'], -1)]] as const
  const tOp = ni + op.reduce((s, [, v]) => s + v, 0), tInv = inv.reduce((s, [, v]) => s + v, 0), tFin = fin.reduce((s, [, v]) => s + v, 0)
  const open = sumBy(balances, type, ['CASH_BANK'], null, dayBefore(from), 1)
  const r = (l: string, v: number) => [l, formatIdr(v)]
  return [
    ['Keterangan', 'Nilai'],
    ['Aktifitas Operasi'], r('Laba/Rugi', ni), ...op.map(([l, v]) => r(l, v)), r('Total Aktifitas Operasi', tOp),
    ['Investasi'], ...inv.map(([l, v]) => r(l, v)), r('Total Investasi', tInv),
    ['Pendanaan'], ...fin.map(([l, v]) => r(l, v)), r('Total Pendanaan', tFin),
    r('Total dari Arus Kas Bersih yang digunakan (dipakai) di periode ini', tOp + tInv + tFin),
    r('Kas & Setara Kas di Awal period', open), r('Kas & Setara Kas di Akhir period', open + tOp + tInv + tFin),
  ]
}

type Group = 'sales' | 'purchases' | 'pl' | 'opAsset' | 'opLiab' | 'invest' | 'finance'
const GROUP: Record<AccountType, Group | null> = {
  CASH_BANK: null, ACCOUNT_RECEIVABLE: 'sales', ACCOUNT_PAYABLE: 'purchases',
  REVENUE: 'pl', OTHER_INCOME: 'pl', COGS: 'pl', EXPENSE: 'pl', OTHER_EXPENSE: 'pl',
  INVENTORY: 'opAsset', OTHER_CURRENT_ASSET: 'opAsset', ACCUMULATED_DEPRECIATION: 'opAsset',
  OTHER_CURRENT_LIABILITY: 'opLiab', FIXED_ASSET: 'invest', OTHER_ASSET: 'invest', LONG_TERM_LIABILITY: 'finance', EQUITY: 'finance',
}

/**
 * Direct method: only journals that move cash count; each non-cash line contributes its cash effect −(D − C),
 * listed under its account. Accruals without a cash line (fixture J6) never appear.
 */
export function cashFlowDirect(accounts: TbAccount[], balances: DailyBalance[], journals: Journal[], from: string, to: string): string[][] {
  const acc = new Map(accounts.map(a => [a.no, a]))
  const byAcc = new Map<string, number>()
  for (const j of journals) {
    if (j.date < from || j.date > to || !j.lines.some(l => acc.get(l.account)!.type === 'CASH_BANK')) continue
    for (const l of j.lines) if (acc.get(l.account)!.type !== 'CASH_BANK') byAcc.set(l.account, (byAcc.get(l.account) ?? 0) - (l.debit - l.credit))
  }
  const lines = (g: Group, filter: (t: AccountType) => boolean = () => true) =>
    [...byAcc].filter(([no]) => GROUP[acc.get(no)!.type] === g && filter(acc.get(no)!.type)).sort(([a], [b]) => (a < b ? -1 : 1))
  const total = (ls: [string, number][]) => ls.reduce((s, [, v]) => s + v, 0)
  const row = ([no, v]: [string, number]) => [acc.get(no)!.name, formatIdr(v)]
  const income = lines('pl', t => t === 'REVENUE' || t === 'OTHER_INCOME'), spend = lines('pl', t => t !== 'REVENUE' && t !== 'OTHER_INCOME')
  const sales = total(lines('sales')), purchases = total(lines('purchases'))
  const opBefore = sales + purchases + total(income) + total(spend)
  const opA = lines('opAsset'), opL = lines('opLiab'), inv = lines('invest'), fin = lines('finance')
  const tOp = opBefore + total(opA) + total(opL)
  const net = tOp + total(inv) + total(fin)
  const type = new Map(accounts.map(a => [a.no, a.type]))
  const open = sumBy(balances, type, ['CASH_BANK'], null, dayBefore(from), 1)
  return [
    ['Keterangan', 'Nilai'],
    ['Aktifitas Operasi'],
    ['Kas dari Penjualan', formatIdr(sales)], ...income.map(row),
    ['Kas untuk Pembelian', formatIdr(purchases)], ...spend.map(row),
    ['Laba(Rugi) Operasi sebelum berubah di Operasi Aset dan Liabilitas', formatIdr(opBefore)],
    ['Berkurang(Bertambah) pada Operasi Aset'], ...opA.map(row), ['Total Berkurang(Bertambah) pada Operasi Aset', formatIdr(total(opA))],
    ['Berkurang(Bertambah) pada Operasi Liabilitas'], ...opL.map(row), ['Total Berkurang(Bertambah) pada Operasi Liabilitas', formatIdr(total(opL))],
    ['Total Kas bersih (dipakai)/ dihasilkan oleh Aktivitas Operasi', formatIdr(tOp)],
    ['Aktifitas Investasi'], ...inv.map(row), ['Total Kas bersih yg dihasilkan / (dipakai) oleh Aktivitas Investasi', formatIdr(total(inv))],
    ['Aktifitas Pendanaan'], ...fin.map(row), ['Total Kas bersih yg dihasilkan / (dipakai) oleh Aktivitas Pendanaan', formatIdr(total(fin))],
    ['Kas bersih dihasilkan oleh / (dipakai) di Period ini', formatIdr(net)],
    ['Kas & Setara Kas di Awal period', formatIdr(open)],
    ['Kas & Setara Kas di Akhir period', formatIdr(open + net)],
  ]
}
