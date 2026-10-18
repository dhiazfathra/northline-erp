import { formatIdr, trialBalance, type AccountType, type DailyBalance, type LedgerSettings, type TbAccount } from './trial-balance'

// Buku Besar listings; rules in docs/reports/GeneralLedger*.md, JournalListReport.md, AllJournalReport.md.
// Every function returns text rows shaped like Accurate's printed table (empty cells dropped).

export interface Journal { number: string; date: string; description: string; lines: { account: string; debit: number; credit: number; memo: string | null }[] }

const CREDIT_NORMAL: ReadonlySet<AccountType> = new Set([
  'ACCOUNT_PAYABLE', 'OTHER_CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'EQUITY', 'REVENUE', 'OTHER_INCOME', 'ACCUMULATED_DEPRECIATION',
])
/** "Dinormalkan": positive on the account's normal side. */
const normalized = (type: AccountType, net: number) => (CREDIT_NORMAL.has(type) ? -net : net)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const fmtDate = (iso: string) => `${iso.slice(8, 10)} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
const dayBefore = (iso: string) => new Date(Date.parse(iso + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10)
const row = (...cells: string[]) => cells.filter(c => c !== '')
const TYPE_LABEL = 'Jurnal Umum' // only JV exists so far; other sources get their own labels

const byDateNumber = (a: Journal, b: Journal) => (a.date + a.number < b.date + b.number ? -1 : a.date + a.number > b.date + b.number ? 1 : 0)

/** Jurnal Umum: one row per journal; Nilai = total debit. */
export function journalList(journals: Journal[]): string[][] {
  return [
    ['Nomor #', 'No. Trans #', 'Tanggal', 'Tipe Transaksi', 'Nilai', 'Keterangan'],
    ...[...journals].sort(byDateNumber).map(j => row(j.number, j.number, fmtDate(j.date), TYPE_LABEL, formatIdr(sum(j, 'debit')), j.description)),
  ]
}

/** Keseluruhan Jurnal: a block per journal with its lines and totals. */
export function allJournals(journals: Journal[], accounts: TbAccount[]): string[][] {
  const name = new Map(accounts.map(a => [a.no, a.name]))
  return [...journals].sort(byDateNumber).flatMap(j => [
    row('Tanggal', ':', fmtDate(j.date), 'No. Trans #', ':', j.number),
    row('Tipe Transaksi', ':', TYPE_LABEL, 'Deskripsi', ':', j.description),
    ['Kode Perkiraan', 'Nama Perkiraan', 'Debit', 'Kredit'],
    ...j.lines.map(l => [l.account, name.get(l.account)!, formatIdr(l.debit), formatIdr(l.credit)]),
    [formatIdr(sum(j, 'debit')), formatIdr(sum(j, 'credit'))],
  ])
}

/** Histori Buku Besar: lines grouped under a date row. */
export function glHistory(journals: Journal[], accounts: TbAccount[]): string[][] {
  const name = new Map(accounts.map(a => [a.no, a.name]))
  const out: string[][] = [['Tipe Transaksi Jurnal', 'No Bukti #', 'Kode #', 'Nama Perkiraan', 'Keterangan Jurnal', 'Debit', 'Kredit']]
  let date = ''
  for (const j of [...journals].sort(byDateNumber)) {
    if (j.date !== date) out.push([fmtDate((date = j.date))])
    for (const l of j.lines) out.push(row(TYPE_LABEL, j.number, l.account, name.get(l.account)!, j.description, formatIdr(l.debit), formatIdr(l.credit)))
  }
  return out
}

/** Opening/closing net (D − C) per account at `from`, with the trial balance's fiscal-year and retained-earnings rules. */
function openings(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, from: string, to: string) {
  const rows = trialBalance(accounts, balances, settings, { from, to, showZeroBalance: true, showParentAccount: true })
  return new Map(rows.map(r => [r.no, { opening: r.openingDebit - r.openingCredit, debit: r.debit, credit: r.credit, depth: r.depth }]))
}

/** Ringkasan Buku Besar: trial balance with normalized single-column opening/closing. */
export function glSummary(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, from: string, to: string, showZeroBalance: boolean): string[][] {
  const type = new Map(accounts.map(a => [a.no, a.type]))
  return [
    ['Kode', 'Nama', 'Saldo Awal (Dinormalkan)', 'Perubahan Debit', 'Perubahan Kredit', 'Saldo Akhir (Dinormalkan)'],
    ...trialBalance(accounts, balances, settings, { from, to, showZeroBalance, showParentAccount: true }).map(r => {
      const t = type.get(r.no)!, opening = r.openingDebit - r.openingCredit
      return [r.no, r.name, formatIdr(normalized(t, opening)), formatIdr(r.debit), formatIdr(r.credit), formatIdr(normalized(t, opening + r.debit - r.credit))]
    }),
  ]
}

/** Rincian Buku Besar: per account with transactions, opening "Saldo per" row, lines with running balance, totals. */
export function glDetail(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, journals: Journal[], from: string, to: string): string[][] {
  const open = openings(accounts, balances, settings, from, to)
  const lines = new Map<string, { date: string; memo: string; debit: number; credit: number }[]>()
  for (const j of [...journals].sort(byDateNumber))
    for (const l of j.lines) lines.set(l.account, [...(lines.get(l.account) ?? []), { date: j.date, memo: l.memo ?? '', debit: l.debit, credit: l.credit }])
  const prev = fmtDate(dayBefore(from))
  const out: string[][] = [['Tanggal', 'Tipe Transaksi', 'Keterangan', 'Debit', 'Kredit', 'Saldo Akhir']]
  for (const r of trialBalance(accounts, balances, settings, { from, to, showZeroBalance: true, showParentAccount: false })) {
    const ls = lines.get(r.no)
    if (!ls) continue // showOnlyHasTransaction
    const t = accounts.find(a => a.no === r.no)!.type
    let bal = normalized(t, open.get(r.no)!.opening)
    out.push([`${r.no} - ${r.name}`], [prev, `Saldo per ${prev}`, formatIdr(bal)])
    let d = 0, c = 0
    for (const l of ls) {
      bal += normalized(t, l.debit - l.credit); d += l.debit; c += l.credit
      out.push(row(fmtDate(l.date), TYPE_LABEL, l.memo, formatIdr(l.debit), formatIdr(l.credit), formatIdr(bal)))
    }
    out.push([formatIdr(d), formatIdr(c)])
  }
  return out
}

const sum = (j: Journal, k: 'debit' | 'credit') => j.lines.reduce((s, l) => s + l[k], 0)
