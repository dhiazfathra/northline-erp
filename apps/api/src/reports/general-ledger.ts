import { formatIdr, trialBalance, type AccountType, type DailyBalance, type LedgerSettings, type TbAccount } from './trial-balance'

// Buku Besar listings; rules in docs/reports/GeneralLedger*.md, JournalListReport.md, AllJournalReport.md.
// Every function returns text rows shaped like Accurate's printed table (empty cells dropped).

export interface Journal { number: string; date: string; description: string; sourceType?: string; lines: { account: string; debit: number; credit: number; memo: string | null }[] }

const CREDIT_NORMAL: ReadonlySet<AccountType> = new Set([
  'ACCOUNT_PAYABLE', 'OTHER_CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'EQUITY', 'REVENUE', 'OTHER_INCOME', 'ACCUMULATED_DEPRECIATION',
])
/** "Dinormalkan": positive on the account's normal side. */
const normalized = (type: AccountType, net: number) => (CREDIT_NORMAL.has(type) ? -net : net)

// Row dates abbreviate August as "Agt"; period headers ("s/d 31 Agu 2033") use "Agu" — both verified (purchase-t3.json).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const fmtDate = (iso: string) => `${iso.slice(8, 10)} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
/** Period headers ("Dari … s/d …", "Per Tgl. …") spell August "Agu". */
export const fmtHeaderDate = (iso: string) => fmtDate(iso).replace(' Agt ', ' Agu ')
const dayBefore = (iso: string) => new Date(Date.parse(iso + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10)
const row = (...cells: string[]) => cells.filter(c => c !== '')
const SOURCE_LABEL: Record<string, string> = { JV: 'Jurnal Umum', SI: 'Faktur Penjualan', SR: 'Penerimaan Penjualan', PI: 'Faktur Pembelian', PP: 'Pembayaran Pembelian', FA: 'Aset Tetap', PE: 'Proses Akhir Bulan (Penyusutan)', SRT: 'Retur Penjualan', PRT: 'Retur Pembelian', SDP: 'Uang Muka Penjualan', PDP: 'Uang Muka Pembelian', IA: 'Penyesuaian Persediaan', FAD: 'Disposisi Aset Tetap', DO: 'Pengiriman Pesanan', OP: 'Pembayaran', OD: 'Penerimaan', RI: 'Penerimaan Barang', EXP: 'Pencatatan Beban', ELD: 'Pencairan Pinjaman' }
/** Tipe Transaksi printed for a journal's source document. */
export const typeLabel = (j: Pick<Journal, 'sourceType'>) => SOURCE_LABEL[j.sourceType ?? 'JV']!

const byDateNumber = (a: Journal, b: Journal) => (a.date + a.number < b.date + b.number ? -1 : a.date + a.number > b.date + b.number ? 1 : 0)

/** Jurnal Umum: one row per journal; Nilai = total debit. */
export function journalList(journals: Journal[]): string[][] {
  return [
    ['Nomor #', 'No. Trans #', 'Tanggal', 'Tipe Transaksi', 'Nilai', 'Keterangan'],
    ...[...journals].sort(byDateNumber).map(j => row(j.number, j.number, fmtDate(j.date), typeLabel(j), formatIdr(sum(j, 'debit')), j.description)),
  ]
}

/** Keseluruhan Jurnal: a block per journal with its lines and totals. */
export function allJournals(journals: Journal[], accounts: TbAccount[]): string[][] {
  const name = new Map(accounts.map(a => [a.no, a.name]))
  return [...journals].sort(byDateNumber).flatMap(j => [
    row('Tanggal', ':', fmtDate(j.date), 'No. Trans #', ':', j.number),
    row('Tipe Transaksi', ':', typeLabel(j), 'Deskripsi', ':', j.description),
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
    for (const l of j.lines) out.push(row(typeLabel(j), j.number, l.account, name.get(l.account)!, j.description, formatIdr(l.debit), formatIdr(l.credit)))
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
  const lines = new Map<string, { date: string; memo: string; debit: number; credit: number; sourceType?: string }[]>()
  for (const j of [...journals].sort(byDateNumber))
    for (const l of j.lines) lines.set(l.account, [...(lines.get(l.account) ?? []), { date: j.date, memo: l.memo ?? '', debit: l.debit, credit: l.credit, sourceType: j.sourceType }])
  const prev = fmtDate(dayBefore(from))
  // the "Saldo per" text spells the month in English ("31 Dec 2044", Trade Portal Demo); the date cell stays Indonesian
  const prevEn = `${prev.slice(0, 3)}${EN_MONTHS[Number(dayBefore(from).slice(5, 7)) - 1]}${prev.slice(6)}`
  const out: string[][] = [['Tanggal', 'Tipe Transaksi', 'Keterangan', 'Debit', 'Kredit', 'Saldo Akhir']]
  for (const r of trialBalance(accounts, balances, settings, { from, to, showZeroBalance: true, showParentAccount: false })) {
    const ls = lines.get(r.no)
    if (!ls) continue // showOnlyHasTransaction
    const t = accounts.find(a => a.no === r.no)!.type
    let bal = normalized(t, open.get(r.no)!.opening)
    out.push([`${r.no} - ${r.name}`], [prev, `Saldo per ${prevEn}`, formatIdr(bal)])
    let d = 0, c = 0
    for (const l of ls) {
      bal += normalized(t, l.debit - l.credit); d += l.debit; c += l.credit
      out.push(row(fmtDate(l.date), typeLabel(l), l.memo, formatIdr(l.debit), formatIdr(l.credit), formatIdr(bal)))
    }
    out.push([formatIdr(d), formatIdr(c)])
  }
  return out
}

const sum = (j: Journal, k: 'debit' | 'credit') => j.lines.reduce((s, l) => s + l[k], 0)

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CASH_BANK: 'Kas & Bank', ACCOUNT_RECEIVABLE: 'Piutang Usaha', INVENTORY: 'Persediaan', OTHER_CURRENT_ASSET: 'Aset Lancar Lainnya',
  FIXED_ASSET: 'Aset Tetap', ACCUMULATED_DEPRECIATION: 'Akumulasi Penyusutan', OTHER_ASSET: 'Aset Lainnya', ACCOUNT_PAYABLE: 'Utang Usaha',
  OTHER_CURRENT_LIABILITY: 'Liabilitas Jangka Pendek', LONG_TERM_LIABILITY: 'Liabilitas Jangka Panjang', EQUITY: 'Modal',
  REVENUE: 'Pendapatan', COGS: 'Beban Pokok Penjualan', EXPENSE: 'Beban', OTHER_INCOME: 'Pendapatan Lainnya', OTHER_EXPENSE: 'Beban Lainnya',
}

/** Rincian Jurnal Akun: per account with lines in range, each line's normalized amount, then the block total. */
export function journalDetailList(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, journals: Journal[], from: string, to: string): string[][] {
  const lines = new Map<string, { number: string; date: string; net: number; sourceType?: string }[]>()
  for (const j of [...journals].sort(byDateNumber))
    for (const l of j.lines) lines.set(l.account, [...(lines.get(l.account) ?? []), { number: j.number, date: j.date, net: l.debit - l.credit, sourceType: j.sourceType }])
  const out: string[][] = []
  for (const r of trialBalance(accounts, balances, settings, { from, to, showZeroBalance: true, showParentAccount: false })) {
    const ls = lines.get(r.no)
    if (!ls) continue
    const t = accounts.find(a => a.no === r.no)!.type
    out.push(['Kode Perkiraan', ':', r.no, 'Tipe Akun', ':', ACCOUNT_TYPE_LABEL[t]], ['Nama', ':', r.name], ['No. Trans #', 'Tipe Transaksi', 'Tanggal', 'Nilai (Dinormalkan)'])
    for (const l of ls) out.push([l.number, typeLabel(l), fmtDate(l.date), formatIdr(normalized(t, l.net))])
    out.push([formatIdr(normalized(t, ls.reduce((s, l) => s + l.net, 0)))])
  }
  return out
}

/** Daftar Akun Perkiraan: every account (zero included) with its normalized balance at `asOf`. */
export function glAccountList(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, asOf: string): string[][] {
  const type = new Map(accounts.map(a => [a.no, a.type]))
  return [
    ['Kode Perkiraan', 'Nama', 'Tipe Akun', 'Saldo'],
    ...trialBalance(accounts, balances, settings, { from: asOf, to: asOf, showZeroBalance: true, showParentAccount: true }).map(r => {
      const t = type.get(r.no)!
      return [r.no, r.name, ACCOUNT_TYPE_LABEL[t], formatIdr(normalized(t, r.closingDebit - r.closingCredit))]
    }),
  ]
}

// CSV downloads (docs/reports/*DownloadReport.md): Accurate's preview of the zipped CSV. Dates ISO, amounts plain rupiah
// with a decimal comma (17493999,5), no grouping; same rows and order as the printed reports.
const csvNum = (cents: number) => String(cents / 100).replace('.', ',')

/** Keseluruhan Jurnal (CSV): one row per journal line. */
export function allJournalsCsv(journals: Journal[], accounts: TbAccount[]): string[][] {
  const name = new Map(accounts.map(a => [a.no, a.name]))
  return [['Kode Perkiraan', 'Nama Perkiraan', 'No. Trans #', 'Tanggal', 'Tipe Transaksi', 'Deskripsi', 'Debit', 'Kredit'],
    ...[...journals].sort(byDateNumber).flatMap(j => j.lines.map(l => [l.account, name.get(l.account)!, j.number, j.date, typeLabel(j), j.description, csvNum(l.debit), csvNum(l.credit)]))]
}

/** Histori Buku Besar (CSV): the date moves into each line. */
export function glHistoryCsv(journals: Journal[], accounts: TbAccount[]): string[][] {
  const name = new Map(accounts.map(a => [a.no, a.name]))
  return [['Tanggal', 'Tipe Transaksi Jurnal', 'No Bukti #', 'Kode #', 'Nama Perkiraan', 'Keterangan Jurnal', 'Debit', 'Kredit'],
    ...[...journals].sort(byDateNumber).flatMap(j => j.lines.map(l => [j.date, typeLabel(j), j.number, l.account, name.get(l.account)!, j.description, csvNum(l.debit), csvNum(l.credit)]))]
}

/** Rincian Buku Besar (CSV): per account with lines, an opening row dated the day before (empty type/debit/credit), then lines with the running normalized balance; no total row. */
export function glDetailCsv(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, journals: Journal[], from: string, to: string): string[][] {
  const open = openings(accounts, balances, settings, from, to), prev = dayBefore(from)
  const out: string[][] = [['Kode Perkiraan', 'Nama', 'Tipe Akun', 'Tanggal', 'Tipe Transaksi', 'Keterangan', 'Debit', 'Kredit', 'Saldo Akhir']]
  for (const r of trialBalance(accounts, balances, settings, { from, to, showZeroBalance: true, showParentAccount: false })) {
    const ls = [...journals].sort(byDateNumber).flatMap(j => j.lines.filter(l => l.account === r.no).map(l => ({ j, l })))
    if (!ls.length) continue
    const t = accounts.find(a => a.no === r.no)!.type, head = [r.no, r.name, ACCOUNT_TYPE_LABEL[t]]
    let bal = normalized(t, open.get(r.no)!.opening)
    out.push([...head, prev, '', `Saldo per ${fmtHeaderDate(prev)}`, '', '', csvNum(bal)])
    for (const { j, l } of ls) { bal += normalized(t, l.debit - l.credit); out.push([...head, j.date, typeLabel(j), l.memo ?? j.description, csvNum(l.debit), csvNum(l.credit), csvNum(bal)]) }
  }
  return out
}

/** Rincian Jurnal Akun (CSV): one row per account line with its normalized amount; no block totals. */
export function journalDetailListCsv(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, journals: Journal[], from: string, to: string): string[][] {
  const out: string[][] = [['Kode Perkiraan', 'Nama', 'Tipe Akun', 'No. Trans #', 'Tipe Transaksi', 'Tanggal', 'Nilai (Dinormalkan)']]
  for (const r of trialBalance(accounts, balances, settings, { from, to, showZeroBalance: true, showParentAccount: false })) {
    const t = accounts.find(a => a.no === r.no)!.type
    for (const j of [...journals].sort(byDateNumber)) for (const l of j.lines.filter(l => l.account === r.no))
      out.push([r.no, r.name, ACCOUNT_TYPE_LABEL[t], j.number, typeLabel(j), j.date, csvNum(normalized(t, l.debit - l.credit))])
  }
  return out
}
