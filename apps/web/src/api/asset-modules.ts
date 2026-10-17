import type { AssetExpenditure, AssetExpenditureForm, AssetLocation } from '@northline/schemas/asset-modules'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { mock } from './mock'

const expenditures: AssetExpenditure[] = [
  { id: 'ax-6', number: 'AX.2026.10.00006', date: '16/10/2026', description: 'Servis besar forklift gudang', qty: 1, total: 8_750_000, status: 'Draf', branch: 'Jakarta' },
  { id: 'ax-5', number: 'AX.2026.10.00005', date: '14/10/2026', description: 'Upgrade RAM & SSD laptop tim finance', qty: 6, total: 12_450_000, status: 'Disetujui', branch: 'Jakarta' },
  { id: 'ax-4', number: 'AX.2026.10.00004', date: '09/10/2026', description: 'Overhaul mesin genset kantor', qty: 1, total: 21_300_000, status: 'Disetujui', branch: 'Surabaya' },
  { id: 'ax-3', number: 'AX.2026.10.00003', date: '04/10/2026', description: 'Renovasi atap gudang Cikarang', qty: 1, total: 46_200_000, status: 'Disetujui', branch: 'Cikarang' },
  { id: 'ax-2', number: 'AX.2026.09.00002', date: '22/09/2026', description: 'Ganti ban truk boks B 9123 KX', qty: 6, total: 15_600_000, status: 'Disetujui', branch: 'Cikarang' },
  { id: 'ax-1', number: 'AX.2026.09.00001', date: '11/09/2026', description: 'Instalasi AC ruang server', qty: 2, total: 18_900_000, status: 'Draf', branch: 'Jakarta' },
]

export const fixedAssets = [
  { code: 'AT-0101', name: 'Forklift Toyota 2,5 Ton' },
  { code: 'AT-0102', name: 'Truk Boks Isuzu Elf' },
  { code: 'AT-0201', name: 'Laptop Lenovo ThinkPad T14' },
  { code: 'AT-0202', name: 'Server Dell PowerEdge R650' },
  { code: 'AT-0301', name: 'Genset Perkins 100 kVA' },
  { code: 'AT-0401', name: 'Gudang Cikarang' },
]

const locations: Record<string, AssetLocation[]> = {
  Jakarta: [
    { name: 'Kantor Pusat', address: 'Jl. Jend. Sudirman Kav. 52, Jakarta Selatan', qty: 48 },
    { name: 'Ruang Server', address: 'Jl. Jend. Sudirman Kav. 52 Lt. 3, Jakarta Selatan', qty: 12 },
  ],
  Surabaya: [{ name: 'Cabang Surabaya', address: 'Jl. Raya Darmo No. 88, Surabaya', qty: 21 }],
  Cikarang: [
    { name: 'Gudang Cikarang', address: 'Kawasan Industri Jababeka Blok F2, Cikarang', qty: 34 },
    { name: 'Pool Kendaraan', address: 'Jl. Industri Selatan 5, Cikarang', qty: 9 },
  ],
}
export const branches = ['Semua', ...Object.keys(locations)]

export const assetExpendituresQuery = queryOptions({ queryKey: ['asset-modules'], queryFn: () => mock(expenditures) })
export const assetLocationsQuery = (branch: string, date: string) =>
  queryOptions({
    queryKey: ['asset-modules', 'by-location', branch, date],
    queryFn: () => mock(branch === 'Semua' ? Object.values(locations).flat() : (locations[branch] ?? [])),
  })

export function useCreateAssetExpenditure() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (f: AssetExpenditureForm) => {
      const n = expenditures.length + 1
      const [d, m, y] = f.date.split('/')
      const dpp = Number(f.dpp || 0)
      const row: AssetExpenditure = {
        id: `ax-${n}`,
        number: `AX.${y}.${m}.${String(n).padStart(5, '0')}`,
        date: `${d}/${m}/${y}`,
        description: f.description,
        qty: f.lines.reduce((s, l) => s + Number(l.qty), 0),
        total: Math.round(dpp * 1.11),
        status: 'Draf',
        branch: 'Jakarta',
      }
      expenditures.unshift(row)
      return mock(row, 500)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asset-modules'] }),
  })
}
