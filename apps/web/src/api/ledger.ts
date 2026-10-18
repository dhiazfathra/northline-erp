import type { Bank, DefaultAccount, Feature, MonthEndRun, TbAccount } from '@northline/schemas/ledger'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { accounts, balances, journals, leafAccounts, parseDate } from '@northline/schemas/fixtures'
import { mock } from './mock'

export const TB_FROM = '01/09/2026'
export const TB_TO = '17/10/2026'

// Leaf accounts over the period; opening = everything before TB_FROM.
function trialBalance(): TbAccount[] {
  const from = parseDate(TB_FROM)
  const to = parseDate(TB_TO)
  const before = balances('01/01/2000', '31/08/2026')
  return leafAccounts.map((a) => {
    let debit = 0
    let credit = 0
    for (const j of journals) {
      const t = parseDate(j.date)
      if (t < from || t > to) continue
      for (const l of j.lines)
        if (l.account === a.code) {
          debit += l.debit
          credit += l.credit
        }
    }
    return { code: a.code, name: a.name, opening: before.get(a.code) ?? 0, debit, credit }
  })
}

export const trialBalanceQuery = queryOptions({ queryKey: ['ledger', 'trial-balance'], queryFn: () => mock(trialBalance()) })

// Reconciliation pairs each journal line on a Kas & Bank leaf with the bank statement.
const banks: Bank[] = ['1101', '1102', '1103'].map((code) => {
  const acc = accounts.find((a) => a.code === code)!
  const entries = journals.flatMap((j) =>
    j.lines
      .filter((l) => l.account === code)
      .map((l, i) => ({
        id: `${j.jv}-${code}-${i}`,
        date: j.date,
        side: l.debit ? ('debit' as const) : ('credit' as const),
        amount: l.debit || l.credit,
        type: j.source,
        no: j.no,
        party: j.description,
        matched: false,
      })),
  )
  return { name: `${code} ${acc.name}`, balance: balances().get(code) ?? 0, entries }
})

export const banksQuery = queryOptions({ queryKey: ['ledger', 'banks'], queryFn: () => mock(banks) })

export function useMatchEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      for (const b of banks) for (const e of b.entries) if (e.id === id) e.matched = true
      return mock(id, 200)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ledger', 'banks'] }),
  })
}

const runs: MonthEndRun[] = [{ name: 'Proses Akhir Bulan September 2026', date: '30/09/2026', note: 'Revaluasi kurs US Dollar 15,500' }]
export const monthEndRunsQuery = queryOptions({ queryKey: ['ledger', 'month-end'], queryFn: () => mock(runs) })

export function useRunMonthEnd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (run: MonthEndRun) => {
      runs.unshift(run)
      return mock(run, 500)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ledger', 'month-end'] }),
  })
}

let features: Feature[] = [
  { id: 'fx', group: 'Penjualan & Pembelian', name: 'Multi Mata Uang', on: true, oneWay: true },
  { id: 'sqo', group: 'Penjualan & Pembelian', name: 'Penawaran dan Pesanan Penjualan', on: false },
  { id: 'sret', group: 'Penjualan & Pembelian', name: 'Retur Penjualan', on: false },
  { id: 'dp', group: 'Penjualan & Pembelian', name: 'Uang Muka', on: true, hasData: true },
  { id: 'budget', group: 'Akuntansi', name: 'Anggaran', on: false },
  { id: 'fa', group: 'Akuntansi', name: 'Aset Tetap', on: true, hasData: true },
  { id: 'mfg', group: 'Persediaan', name: 'Manufaktur', on: false, oneWay: true },
  { id: 'wh', group: 'Persediaan', name: 'Multi Gudang', on: true },
  { id: 'serial', group: 'Persediaan', name: 'Nomor Seri', on: false, lockedNote: 'Hanya tersedia jika Multi Gudang dan Batch aktif' },
  { id: 'efaktur', group: 'Perpajakan', name: 'e-Faktur', on: false, price: 150_000 },
]
export const featuresQuery = queryOptions({ queryKey: ['prefs', 'features'], queryFn: () => mock(features) })

export function useSaveFeatures() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (next: Feature[]) => {
      features = next
      return mock(next, 400)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prefs'] }),
  })
}

const acc = (code: string) => `${code} ${accounts.find((a) => a.code === code)!.name}`
const defaultAccounts: DefaultAccount[] = [
  { label: 'Akun Kas Default', value: acc('1102') },
  { label: 'Akun Bank Default', value: acc('1101') },
  { label: 'Akun Piutang Usaha', value: acc('110301') },
  { label: 'Akun Utang Usaha', value: acc('210101') },
  { label: 'Akun Pendapatan', value: acc('400001') },
  { label: 'Akun Diskon Penjualan', value: acc('400004') },
  { label: 'Akun Persediaan', value: acc('110401') },
  { label: 'Akun Beban Pokok Penjualan', value: acc('510101') },
  { label: 'Akun PPN Keluaran', value: acc('210201') },
  { label: 'Akun PPN Masukan', value: acc('110501') },
  { label: 'Akun Selisih Kurs', value: acc('720102') },
]
export const defaultAccountsQuery = queryOptions({ queryKey: ['prefs', 'accounts'], queryFn: () => mock(defaultAccounts) })
