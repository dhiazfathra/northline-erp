import type { Bank, DefaultAccount, Feature, MonthEndRun, TbAccount } from '@northline/schemas/ledger'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { mock } from './mock'

// Openings sum to zero and debits equal credits, so the fixture balances.
const tb: TbAccount[] = [
  { code: '1-1100', name: 'Kas Kecil', opening: 15_000_000, debit: 8_500_000, credit: 11_250_000 },
  { code: '1-1210', name: 'Bank BCA', opening: 412_750_000, debit: 186_400_000, credit: 142_300_000 },
  { code: '1-1220', name: 'Bank Mandiri', opening: 98_200_000, debit: 45_000_000, credit: 61_850_000 },
  { code: '1-1300', name: 'Piutang Usaha', opening: 236_400_000, debit: 152_600_000, credit: 128_900_000 },
  { code: '1-1400', name: 'Persediaan Barang', opening: 318_900_000, debit: 96_300_000, credit: 74_150_000 },
  { code: '2-1100', name: 'Utang Usaha', opening: -184_250_000, debit: 102_450_000, credit: 96_300_000 },
  { code: '2-1300', name: 'Utang PPN', opening: -26_400_000, debit: 0, credit: 16_786_000 },
  { code: '3-1000', name: 'Modal Disetor', opening: -750_000_000, debit: 0, credit: 0 },
  { code: '4-1000', name: 'Pendapatan Penjualan', opening: -186_600_000, debit: 0, credit: 210_400_000 },
  { code: '5-1000', name: 'Beban Pokok Penjualan', opening: 66_000_000, debit: 74_150_000, credit: 0 },
  { code: '6-1100', name: 'Beban Gaji', opening: 0, debit: 61_850_000, credit: 0 },
  { code: '6-1200', name: 'Beban Sewa', opening: 0, debit: 11_250_000, credit: 0 },
  { code: '6-1300', name: 'Beban Listrik & Air', opening: 0, debit: 3_436_000, credit: 0 },
]


export const trialBalanceQuery = queryOptions({ queryKey: ['ledger', 'trial-balance'], queryFn: () => mock(tb) })

const banks: Bank[] = [
  {
    name: '1-1210 Bank BCA',
    balance: 456_850_000,
    entries: [
      { id: 'b1', date: '15/10/2026', side: 'debit', amount: 24_750_000, type: 'Penerimaan Penjualan', no: 'SR.2026.10.00021', party: 'PT Sinar Pesisir', method: 'Transfer', matched: false },
      { id: 'b2', date: '14/10/2026', side: 'credit', amount: 12_300_000, type: 'Pembayaran Pembelian', no: 'PP.2026.10.00018', party: 'PT Sumber Makmur', method: 'Transfer', matched: false },
      { id: 'b3', date: '10/10/2026', side: 'credit', amount: 11_250_000, type: 'Pembayaran', no: 'CP.2026.10.00009', method: 'Cek', matched: false },
      { id: 'b4', date: '06/10/2026', side: 'debit', amount: 8_600_000, type: 'Penerimaan', no: 'CR.2026.10.00007', party: 'CV Maju Bersama', matched: false },
    ],
  },
  {
    name: '1-1220 Bank Mandiri',
    balance: 81_350_000,
    entries: [
      { id: 'm1', date: '12/10/2026', side: 'credit', amount: 61_850_000, type: 'Pembayaran', no: 'CP.2026.10.00011', party: 'Gaji Oktober', method: 'Transfer', matched: false },
      { id: 'm2', date: '02/10/2026', side: 'debit', amount: 45_000_000, type: 'Penerimaan', no: 'CR.2026.10.00002', party: 'Toko Berkah Jaya', matched: false },
    ],
  },
  { name: '1-1230 Bank BNI', balance: 0, entries: [] },
]

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

const runs: MonthEndRun[] = [{ name: 'Proses Akhir Bulan September 2026', date: '30/09/2026', note: 'Revaluasi kurs US Dollar 15.720' }]
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
  { id: 'fx', group: 'Penjualan & Pembelian', name: 'Multi Mata Uang', on: true, hasData: true },
  { id: 'dp', group: 'Penjualan & Pembelian', name: 'Uang Muka', on: true, hasData: true },
  { id: 'proj', group: 'Penjualan & Pembelian', name: 'Proyek', on: false },
  { id: 'wh', group: 'Persediaan', name: 'Multi Gudang', on: true },
  { id: 'serial', group: 'Persediaan', name: 'Nomor Seri', on: false, lockedNote: 'Hanya tersedia jika Multi Gudang dan Batch aktif' },
  { id: 'efaktur', group: 'Perpajakan', name: 'e-Faktur', on: false, price: 150_000 },
  { id: 'ebupot', group: 'Perpajakan', name: 'e-Bupot', on: false, price: 100_000 },
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

const defaultAccounts: DefaultAccount[] = [
  { label: 'Akun Kas Default', value: '1-1100 Kas Kecil' },
  { label: 'Akun Bank Default', value: '1-1210 Bank BCA' },
  { label: 'Akun Piutang Usaha', value: '1-1300 Piutang Usaha' },
  { label: 'Akun Utang Usaha', value: '2-1100 Utang Usaha' },
  { label: 'Akun Pendapatan', value: '4-1000 Pendapatan Penjualan' },
  { label: 'Akun Selisih Kurs', value: '' },
]
export const defaultAccountsQuery = queryOptions({ queryKey: ['prefs', 'accounts'], queryFn: () => mock(defaultAccounts) })
