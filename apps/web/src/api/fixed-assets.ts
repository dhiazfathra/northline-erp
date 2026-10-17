import type { AssetExpense, FixedAsset, FixedAssetForm } from '@northline/schemas/fixed-assets'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { mock } from './mock'

export interface Account {
  code: string
  name: string
  type: string
}

export const categories = ['Bangunan', 'Kendaraan', 'Peralatan Kantor', 'Mesin & Peralatan', 'Komputer & Elektronik', 'Perangkat Lunak']
export const methods = ['Garis Lurus', 'Saldo Menurun', 'Tidak Disusutkan']
export const codeTypes = ['FAA — Aset Tetap', 'FAB — Bangunan', 'FAK — Kendaraan']
export const locations = ['Kantor Pusat Jakarta', 'Gudang Cikarang', 'Cabang Surabaya', 'Cabang Medan']
export const departments = ['Umum', 'Keuangan', 'Operasional', 'Penjualan', 'TI']

export const accounts: Account[] = [
  { code: '1-4100', name: 'Bangunan', type: 'Aset Tetap' },
  { code: '1-4200', name: 'Kendaraan', type: 'Aset Tetap' },
  { code: '1-4300', name: 'Peralatan Kantor', type: 'Aset Tetap' },
  { code: '1-4400', name: 'Mesin & Peralatan', type: 'Aset Tetap' },
  { code: '1-4510', name: 'Akum. Penyusutan Bangunan', type: 'Akumulasi Penyusutan' },
  { code: '1-4520', name: 'Akum. Penyusutan Kendaraan', type: 'Akumulasi Penyusutan' },
  { code: '1-4530', name: 'Akum. Penyusutan Peralatan', type: 'Akumulasi Penyusutan' },
  { code: '6-2100', name: 'Beban Penyusutan Bangunan', type: 'Beban' },
  { code: '6-2200', name: 'Beban Penyusutan Kendaraan', type: 'Beban' },
  { code: '6-2300', name: 'Beban Penyusutan Peralatan', type: 'Beban' },
]

/** Posted asset expenditures that can be capitalised into an asset. */
export const expenditures: AssetExpense[] = [
  { code: 'PA.2026.10.00031', desc: 'Pembelian Toyota Hilux B 9120 KX', date: '2026-10-02', amount: 465_000_000 },
  { code: 'PA.2026.10.00032', desc: 'Laptop ThinkPad X1 ×4', date: '2026-10-05', amount: 98_400_000 },
  { code: 'PA.2026.10.00035', desc: 'Renovasi ruang rapat lt. 3', date: '2026-10-09', amount: 142_750_000 },
  { code: 'PA.2026.10.00038', desc: 'Forklift Toyota 8FD25', date: '2026-10-14', amount: 312_000_000 },
]

const base = { autoCode: false, codeType: '', intangible: false, method: 'Garis Lurus', qty: 1, months: 0, department: 'Umum', note: '', tax: true, files: [], status: 'active' as const }
const assets: FixedAsset[] = [
  { ...base, id: 'fa-1', code: 'FAA.2026.01.00001', name: 'Gedung Kantor Pusat Kuningan', buy: '2026-01-10', use: '2026-01-15', category: 'Bangunan', assetAccount: '1-4100', accumAccount: '1-4510', expenseAccount: '6-2100', years: 20, salvage: 500_000_000, expenses: [{ code: 'PA.2026.01.00002', desc: 'Pembelian gedung Kuningan', date: '2026-01-10', amount: 8_750_000_000 }], location: 'Kantor Pusat Jakarta', lastDep: '2026-09-30', files: [{ name: 'SHGB-Kuningan.pdf', size: 2_450_000, url: '#' }, { name: 'AJB-2026.pdf', size: 1_120_000, url: '#' }] },
  { ...base, id: 'fa-2', code: 'FAA.2026.03.00004', name: 'Toyota Innova Zenix B 1847 KRA', buy: '2026-03-02', use: '2026-03-05', category: 'Kendaraan', assetAccount: '1-4200', accumAccount: '1-4520', expenseAccount: '6-2200', years: 8, salvage: 60_000_000, expenses: [{ code: 'PA.2026.03.00011', desc: 'Pembelian Innova Zenix', date: '2026-03-02', amount: 485_000_000 }], location: 'Kantor Pusat Jakarta', department: 'Operasional', lastDep: '2026-09-30', files: [{ name: 'BPKB-B1847KRA.jpg', size: 840_000, url: '#' }] },
  { ...base, id: 'fa-3', code: 'FAA.2026.05.00007', name: 'Rak Gudang Heavy Duty (set)', buy: '2026-05-12', use: '2026-05-20', category: 'Mesin & Peralatan', assetAccount: '1-4400', accumAccount: '1-4530', expenseAccount: '6-2300', qty: 12, years: 10, salvage: 0, expenses: [{ code: 'PA.2026.05.00019', desc: 'Rak gudang 12 unit', date: '2026-05-12', amount: 186_000_000 }], location: 'Gudang Cikarang', department: 'Operasional', lastDep: '2026-09-30' },
  { ...base, id: 'fa-4', code: 'FAA.2026.08.00009', name: 'Server Dell PowerEdge R760', buy: '2026-08-21', use: '2026-09-01', category: 'Komputer & Elektronik', assetAccount: '1-4300', accumAccount: '1-4530', expenseAccount: '6-2300', years: 4, salvage: 12_000_000, expenses: [{ code: 'PA.2026.08.00027', desc: 'Server + lisensi', date: '2026-08-21', amount: 214_500_000 }], location: 'Kantor Pusat Jakarta', department: 'TI', lastDep: '2026-09-30' },
  { ...base, id: 'fa-5', code: 'FAA.2025.11.00012', name: 'Mesin Fotokopi Canon iR-ADV', buy: '2025-11-03', use: '2025-11-03', category: 'Peralatan Kantor', assetAccount: '1-4300', accumAccount: '1-4530', expenseAccount: '6-2300', years: 5, salvage: 2_500_000, expenses: [{ code: 'PA.2025.11.00004', desc: 'Mesin fotokopi', date: '2025-11-03', amount: 64_900_000 }], location: 'Cabang Surabaya', status: 'disposed', lastDep: '2026-06-30' },
]

export const assetTotal = (a: { expenses: AssetExpense[] }) => a.expenses.reduce((s, x) => s + x.amount, 0)

export const fixedAssetsQuery = queryOptions({ queryKey: ['fixed-assets'], queryFn: () => mock(assets) })
export const fixedAssetQuery = (id: string) =>
  queryOptions({ queryKey: ['fixed-assets', id], queryFn: () => mock(assets.find((a) => a.id === id) ?? null) })

let seq = 13
export function useSaveFixedAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: FixedAssetForm }) => {
      const code = data.autoCode ? `${data.codeType.slice(0, 3)}.2026.10.${String(seq++).padStart(5, '0')}` : data.code
      const i = assets.findIndex((a) => a.id === id)
      const next: FixedAsset = { ...data, code, autoCode: false, id: id ?? `fa-${Date.now()}`, status: 'active', lastDep: i >= 0 ? assets[i]!.lastDep : '' }
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
