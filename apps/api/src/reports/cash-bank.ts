import { fmtDate, typeLabel, type Journal } from './general-ledger'
import { formatIdr, trialBalance, type DailyBalance, type LedgerSettings, type TbAccount } from './trial-balance'

// Kas & Bank reports over journals; rules in docs/reports/BankBookReport.md, CashFlowbyAccountReport.md, CashBankAccountListReport.md.

const EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dayBefore = (iso: string) => new Date(Date.parse(iso + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10)
const inRange = (j: Journal, from: string, to: string) => j.date >= from && j.date <= to
const byDateNumber = (a: Journal, b: Journal) => (a.date + a.number < b.date + b.number ? -1 : 1)
const balanceBefore = (balances: DailyBalance[], no: string, from: string) =>
  balances.filter(b => b.account === no && b.date < from).reduce((s, b) => s + b.debit - b.credit, 0)

/** Histori Bank: one block per selected cash account with opening, lines and running balance. */
export function bankBook(accounts: TbAccount[], balances: DailyBalance[], journals: Journal[], banks: string[], from: string, to: string): string[][] {
  const out: string[][] = []
  for (const no of banks) {
    const a = accounts.find(x => x.no === no)!
    let bal = balanceBefore(balances, no, from)
    const prev = dayBefore(from)
    // "Saldo per" uses an English month abbreviation, the date column the Indonesian one
    const opening = [fmtDate(prev), `Saldo per ${prev.slice(8)} ${EN[Number(prev.slice(5, 7)) - 1]} ${prev.slice(0, 4)}`, formatIdr(bal)]
    out.push(['Kode Perkiraan', ':', a.no, 'Saldo Awal', ':', formatIdr(bal)], ['Nama', ':', a.name],
      ['Tanggal', 'No Bukti #', 'No. Trans #', 'Tipe Transaksi', 'Keterangan', 'Debit', 'Kredit', 'Saldo Akhir'], opening)
    let d = 0, c = 0
    for (const j of journals.filter(j => inRange(j, from, to)).sort(byDateNumber))
      for (const l of j.lines.filter(l => l.account === no)) {
        bal += l.debit - l.credit; d += l.debit; c += l.credit
        out.push([fmtDate(j.date), j.number, j.number, typeLabel(j), ...(l.memo ? [l.memo] : []), formatIdr(l.debit), formatIdr(l.credit), formatIdr(bal)])
      }
    out.push([formatIdr(d), formatIdr(c)])
  }
  return out
}

/**
 * Arus Kas per Akun: for each selected cash account, its movements grouped by counter-account (in order of first
 * appearance), each line valued at the cash effect, a subtotal per counter-account and a total per cash account.
 */
export function cashFlowByAccount(accounts: TbAccount[], journals: Journal[], banks: string[], from: string, to: string): string[][] {
  const name = new Map(accounts.map(a => [a.no, a.name]))
  const out: string[][] = [['Tanggal', 'Tipe Transaksi', 'No. Trans #', 'Keterangan', 'Nilai (Domestik)']]
  for (const no of banks) {
    const groups = new Map<string, string[][]>(), totals = new Map<string, number>()
    for (const j of journals.filter(j => inRange(j, from, to)).sort(byDateNumber)) {
      const cash = j.lines.filter(l => l.account === no)
      if (!cash.length) continue
      for (const l of j.lines.filter(l => l.account !== no)) {
        const v = l.credit - l.debit // counter-account credit = cash in
        groups.set(l.account, [...(groups.get(l.account) ?? []), [fmtDate(j.date), typeLabel(j), j.number, ...(l.memo ? [l.memo] : []), formatIdr(v)]])
        totals.set(l.account, (totals.get(l.account) ?? 0) + v)
      }
    }
    out.push([name.get(no)!])
    for (const [acc, rows] of groups) out.push([name.get(acc)!], ...rows, [formatIdr(totals.get(acc)!)])
    out.push([formatIdr([...totals.values()].reduce((s, v) => s + v, 0))])
  }
  return out
}

/** Daftar Kas: every CASH_BANK account (zero included, parents summed) under its currency, then the currency total over leaves. */
export function cashAccountList(accounts: TbAccount[], balances: DailyBalance[], settings: LedgerSettings, asOf: string): string[][] {
  const cash = accounts.filter(a => a.type === 'CASH_BANK')
  const nos = new Set(cash.map(a => a.no))
  const rows = trialBalance(cash, balances.filter(b => nos.has(b.account)), settings, { from: asOf, to: asOf, showZeroBalance: true, showParentAccount: true })
  const net = (r: (typeof rows)[number]) => r.closingDebit - r.closingCredit
  // shortcut: single-currency ledger; foreign-currency blocks (US Dollar …) arrive with multi-currency accounts.
  const total = rows.filter(r => !r.isParent).reduce((s, r) => s + net(r), 0)
  return [
    ['Kode Perkiraan', 'Nama', 'Saldo (per Mata Uang)', 'Saldo (IDR)'],
    ['Indonesian Rupiah'],
    ...rows.map(r => [r.no, r.name, formatIdr(net(r)), formatIdr(net(r))]),
    [formatIdr(total), formatIdr(total)],
  ]
}

// ---- Pembayaran / Penerimaan reports (fixtures/cash-bank-t18.json) ----
export interface CashDoc { number: string; kind: 'PAY' | 'DEP'; bank: string; bankName: string; date: string; chequeNo: string; description: string; amount: number; lines: { account: string; accountName: string; amount: number; notes: string }[] }
const docsIn = (ds: CashDoc[], kind: 'PAY' | 'DEP', from: string, to: string, banks?: string[]) =>
  ds.filter(x => x.kind === kind && x.date >= from && x.date <= to && (!banks || banks.includes(x.bank))).sort((a, b) => (a.date + a.number < b.date + b.number ? -1 : 1))
const nonEmpty = (...xs: string[]) => xs.filter(x => x !== '')

/** Ringkasan Daftar Pembayaran / Penerimaan; empty cheque numbers print nothing. */
export const cashDocList = (ds: CashDoc[], kind: 'PAY' | 'DEP', from: string, to: string) =>
  [['Tanggal', 'No Cek #', 'Kas/Bank', 'Nilai'], ...docsIn(ds, kind, from, to).map(x => nonEmpty(fmtDate(x.date), x.chequeNo, x.bankName, formatIdr(x.amount)))]

/** Ringkasan Pembayaran/Penerimaan per Bank: per bank, totals per counter-account (by name). */
export function cashByBankSummary(ds: CashDoc[], kind: 'PAY' | 'DEP', banks: string[], from: string, to: string): string[][] {
  const out: string[][] = [['Kas/Bank', 'Nama Akun Perkiraan', 'Jumlah']]
  for (const b of banks) {
    const xs = docsIn(ds, kind, from, to, [b]); if (!xs.length) continue
    const m = new Map<string, number>(); for (const l of xs.flatMap(x => x.lines)) m.set(l.accountName, (m.get(l.accountName) ?? 0) + l.amount)
    const names = [...m.keys()].sort(), total = [...m.values()].reduce((s, v) => s + v, 0)
    out.push(...names.map((n, i) => [...(i === 0 ? [xs[0]!.bankName] : []), n, formatIdr(m.get(n)!)]), ['Total Nama Akun Perkiraan', formatIdr(total)], ['Total Kas/Bank', formatIdr(total)])
  }
  return out
}

/** Rincian Pembayaran/Penerimaan per Bank: per bank and counter-account, the lines. Payments show the line notes,
 *  deposits the account code and name. */
export function cashByBankDetail(ds: CashDoc[], kind: 'PAY' | 'DEP', banks: string[], from: string, to: string): string[][] {
  const out: string[][] = []
  for (const b of banks) {
    const xs = docsIn(ds, kind, from, to, [b]); if (!xs.length) continue
    out.push(['Kas/Bank', ':', xs[0]!.bankName], ['Mata Uang', ':', 'Indonesian Rupiah'],
      kind === 'PAY' ? ['Tanggal', 'No Cek #', 'Keterangan Pembayaran', 'Jumlah'] : ['Tanggal', 'No Cek #', 'Kode Perkiraan', 'Nama', 'Jumlah'])
    const ls = xs.flatMap(x => x.lines.map(l => ({ x, l }))), accs = [...new Set(ls.map(y => y.l.accountName))].sort()
    for (const a of accs) {
      const ys = ls.filter(y => y.l.accountName === a)
      out.push([a], ...ys.map(({ x, l }) => kind === 'PAY' ? nonEmpty(fmtDate(x.date), x.chequeNo, l.notes, formatIdr(l.amount)) : nonEmpty(fmtDate(x.date), x.chequeNo, l.account, l.accountName, formatIdr(l.amount))),
        [formatIdr(ys.reduce((s, y) => s + y.l.amount, 0))])
    }
    out.push([formatIdr(xs.reduce((s, x) => s + x.amount, 0))])
  }
  return out
}

/** Rincian Beban Pembayaran: one block per payment. */
export const paymentLoad = (ds: CashDoc[], banks: string[], from: string, to: string) => docsIn(ds, 'PAY', from, to, banks).flatMap(x => [
  ['Nomor # Pembayaran', ':', x.number, 'Kas/Bank', ':', x.bankName], ['Tanggal Pembayaran', ':', fmtDate(x.date)], ['Rincian Pembayaran', 'Nilai'],
  ...x.lines.map(l => [l.accountName, formatIdr(l.amount)]), [formatIdr(x.amount)]])

/** Transaksi Bank belum Terekonsiliasi: per bank, all unreconciled Pembayaran/Penerimaan under "Histori Bank".
 *  shortcut: covers cash documents only; receipts/payments of invoices and bank reconciliation are not modelled yet. */
export function unreconciledBank(ds: CashDoc[], accounts: TbAccount[], banks: string[], from: string, to: string): string[][] {
  return banks.flatMap(b => { const a = accounts.find(x => x.no === b)!
    const xs = ds.filter(x => x.bank === b && x.date >= from && x.date <= to).sort((p, q) => (p.date + p.number < q.date + q.number ? -1 : 1))
    const v = (x: CashDoc) => (x.kind === 'PAY' ? -x.amount : x.amount)
    return [['Kode Perkiraan', ':', a.no], ['Nama', ':', a.name], ['Tanggal', 'Transaksi', 'Nilai', 'Referensi'], ['Histori Bank'],
      ...xs.map(x => [fmtDate(x.date), `${x.number} - ${x.kind === 'PAY' ? 'Pembayaran' : 'Penerimaan'} : ${x.description}`, formatIdr(v(x))]), [formatIdr(xs.reduce((s, x) => s + v(x), 0))]] })
}

/** Rekening Koran: imported bank statements are not modelled; prints the empty header (verified when no statement exists). */
export const bankStatement = () => [['Kode', ':'], ['Nama', ':'], ['Tanggal', 'Keterangan', 'Mutasi', 'Tipe Mutasi', 'Saldo']]
