import type { AssetExpense, FixedAsset, FixedAssetForm } from '@northline/schemas/fixed-assets'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { journals, leafAccounts } from '@northline/schemas/fixtures'
import { mock } from './mock'

export const categories = ['Peralatan Kantor', 'Kendaraan', 'Bangunan', 'Mesin & Peralatan']
export const methods = ['Garis Lurus', 'Saldo Menurun', 'Tidak Disusutkan']
export const codeTypes = ['FA — Aset Tetap']
export const locations = ['Kantor Pusat Jakarta', 'Gudang Cikarang']
export const departments = ['Umum', 'Keuangan', 'Operasional', 'Penjualan', 'TI']

/** Leaf fixture accounts usable on an asset, by type. */
export const accounts = leafAccounts.filter((a) => ['Aset Tetap', 'Akumulasi Penyusutan', 'Beban'].includes(a.type))

/** Posted asset expenditures that can be capitalised into an asset (none outstanding in the fixtures). */
export const expenditures: AssetExpense[] = []

// S7 · Laptop Uji: opened 01/09, depreciated 250,000 for September, disposed 30/09 at a loss of 11,750,000.
const assets: FixedAsset[] = [
  {
    id: 'fa-1',
    code: 'FA.2026.09.00001',
    name: 'Laptop Uji',
    autoCode: false,
    codeType: '',
    buy: '2026-09-01',
    use: '2026-09-01',
    intangible: false,
    method: 'Garis Lurus',
    category: 'Peralatan Kantor',
    assetAccount: '1201',
    accumAccount: '1202',
    expenseAccount: '6101',
    qty: 1,
    years: 4,
    months: 0,
    salvage: 0,
    expenses: [{ code: 'FA.2026.09.00001', desc: 'Saldo awal aset Laptop Uji', date: '2026-09-01', amount: 12_000_000 }],
    location: 'Kantor Pusat Jakarta',
    department: 'Umum',
    note: '',
    tax: true,
    files: [],
    status: 'disposed',
    lastDep: '2026-09-30',
  },
]

/** Fixture journals posted for an asset (its history). */
export const assetJournals = (code: string) => journals.filter((j) => j.source === 'Aset Tetap' && j.no === code)

export const assetTotal = (a: { expenses: AssetExpense[] }) => a.expenses.reduce((s, x) => s + x.amount, 0)

export const fixedAssetsQuery = queryOptions({ queryKey: ['fixed-assets'], queryFn: () => mock(assets) })
export const fixedAssetQuery = (id: string) =>
  queryOptions({ queryKey: ['fixed-assets', id], queryFn: () => mock(assets.find((a) => a.id === id) ?? null) })

let seq = 1
export function useSaveFixedAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: FixedAssetForm }) => {
      const code = data.autoCode ? `FA.2026.10.${String(seq++).padStart(5, '0')}` : data.code
      const i = assets.findIndex((a) => a.id === id)
      const next: FixedAsset = { ...data, code, autoCode: false, id: id ?? `fa-${Date.now()}`, status: i >= 0 ? assets[i]!.status : 'active', lastDep: i >= 0 ? assets[i]!.lastDep : '' }
      if (i >= 0) assets[i] = next
      else assets.unshift(next)
      return mock(next, 450)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fixed-assets'] }),
  })
}

export function useDeleteFixedAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      assets.splice(assets.findIndex((a) => a.id === id), 1)
      return mock(null, 300)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fixed-assets'] }),
  })
}
