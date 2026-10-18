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
