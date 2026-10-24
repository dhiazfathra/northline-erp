import type { Bank, DefaultAccount, Feature, MonthEndRun, TbAccount } from '@northline/schemas/ledger'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { hc } from 'hono/client'
import type { LedgerWebType } from '../../../api/types/web/ledger'
import { api } from './client'

// Buku Besar screen routes are mounted outside AppType (TS2589 depth limit), so they get their own typed client.
export const ledgerApi = hc<LedgerWebType>('/api/ledger', { init: { credentials: 'same-origin' } })

export const TB_FROM = '01/09/2026'
export const TB_TO = '17/10/2026'

const iso = (d: string) => d.split('/').reverse().join('-')
const dmy = (d: string) => d.split('-').reverse().join('/')
const fail = async (res: Response, what: string) => {
  if (res.ok) return
  const b = (await res.json().catch(() => ({}))) as { error?: string; issues?: { message: string }[] }
  throw new Error(b.issues?.[0]?.message ?? b.error ?? `${what} (${res.status})`)
}

// Leaf rows from the ledger API (cents → rupiah); opening keeps its sign, positive = debit.
export const trialBalanceQuery = queryOptions({
  queryKey: ['ledger', 'trial-balance', TB_FROM, TB_TO],
  queryFn: async (): Promise<TbAccount[]> => {
    const res = await api.reports['trial-balance'].$get({ query: { from: iso(TB_FROM), to: iso(TB_TO), showParentAccount: 'false' } })
    if (!res.ok) throw new Error(`Neraca Percobaan gagal dimuat (${res.status})`)
    return (await res.json()).map((r) => ({
      code: r.no, name: r.name, opening: (r.openingDebit - r.openingCredit) / 100, debit: r.debit / 100, credit: r.credit / 100,
    }))
  },
})

// Reconciliation pairs each journal line on a Kas & Bank leaf with the bank statement (cents → rupiah).
// Entry id is `bank|document|n`; the mutation reconciles the document on that bank.
export const banksQuery = queryOptions({
  queryKey: ['ledger', 'banks'],
  queryFn: async (): Promise<Bank[]> => {
    const res = await ledgerApi.banks.$get({ query: { from: iso(TB_FROM), to: iso(TB_TO) } })
    await fail(res, 'Bank gagal dimuat')
    return (await res.json()).map((b) => ({ name: b.name, balance: b.balance / 100, entries: b.entries.map((e) => ({ ...e, date: dmy(e.date), amount: e.amount / 100 })) }))
  },
})

export function useMatchEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const e = qc.getQueryData(banksQuery.queryKey)?.flatMap((b) => b.entries).find((x) => x.id === id)
      const [bank, document] = id.split('|')
      const res = await ledgerApi.banks.reconcile.$post({ json: { bank: bank!, document: document!, statementDate: iso(e?.date ?? TB_TO) } })
      await fail(res, 'Gagal menyimpan')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ledger', 'banks'] }),
  })
}

export const monthEndRunsQuery = queryOptions({
  queryKey: ['ledger', 'month-end'],
  queryFn: async (): Promise<MonthEndRun[]> => {
    const res = await ledgerApi['period-ends'].$get()
    await fail(res, 'Proses akhir bulan gagal dimuat')
    return (await res.json()).map((r) => ({ name: `Proses Akhir Bulan ${r.number}`, date: dmy(r.date), note: '' }))
  },
})

export function useRunMonthEnd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const res = await api['period-ends'].$post({ json: { idempotencyKey: crypto.randomUUID(), period: `${year}-${String(month).padStart(2, '0')}` } } as never)
      await fail(res, 'Gagal menyimpan')
      return (await res.json()) as { number: string }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ledger', 'month-end'] }),
  })
}

// Feature names and rules live here; the API stores only which ids are on.
const featureCatalog: Feature[] = [
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
export type CostingMethod = 'FIFO' | 'AVERAGE'
// Metode persediaan (ADR-0031); `locked` once any stock movement exists.
export const costingMethodQuery = queryOptions({
  queryKey: ['prefs', 'costing-method'],
  queryFn: async () => {
    const res = await api.settings['costing-method'].$get()
    if (!res.ok) throw new Error(`Metode persediaan gagal dimuat (${res.status})`)
    return res.json() as Promise<{ method: CostingMethod; locked: boolean }>
  },
})

export function useSaveCostingMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (method: CostingMethod) => {
      const res = await api.settings['costing-method'].$put({ json: { method } })
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? `Gagal menyimpan (${res.status})`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prefs', 'costing-method'] }),
  })
}

export type ReportPreferences = { agingBasis: 'DUE_DATE' | 'INVOICE_DATE'; reportStyle: 'RETAIL' | 'STANDARD' }
// Umur piutang/utang and project P&L layout (ADR-0037); free to change, no ledger impact.
export const reportPreferencesQuery = queryOptions({
  queryKey: ['prefs', 'report-preferences'],
  queryFn: async () => {
    const res = await api.settings['report-preferences'].$get()
    if (!res.ok) throw new Error(`Preferensi laporan gagal dimuat (${res.status})`)
    return res.json() as Promise<ReportPreferences>
  },
})

export function useSaveReportPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: ReportPreferences) => {
      const res = await api.settings['report-preferences'].$put({ json: p })
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? `Gagal menyimpan (${res.status})`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prefs', 'report-preferences'] }),
  })
}

export const featuresQuery = queryOptions({
  queryKey: ['prefs', 'features'],
  queryFn: async (): Promise<Feature[]> => {
    const res = await ledgerApi.features.$get()
    await fail(res, 'Fitur gagal dimuat')
    const on = await res.json()
    return featureCatalog.map((f) => ({ ...f, on: on[f.id] ?? f.on }))
  },
})

export function useSaveFeatures() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (next: Feature[]) => {
      const res = await ledgerApi.features.$put({ json: Object.fromEntries(next.map((f) => [f.id, f.on])) })
      await fail(res, 'Gagal menyimpan')
      return next
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prefs'] }),
  })
}

export const defaultAccountsQuery = queryOptions({
  queryKey: ['prefs', 'accounts'],
  queryFn: async (): Promise<DefaultAccount[]> => {
    const res = await ledgerApi['default-accounts'].$get()
    await fail(res, 'Akun default gagal dimuat')
    return res.json()
  },
})
