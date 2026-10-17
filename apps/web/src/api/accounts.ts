import type { Account, AccountInput } from '@northline/schemas/accounts'
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mock } from './mock'

const base = { note: '', bank: '', accNo: '', accName: '', opening: 0, openDate: '2026-01-01', allUsers: true, users: [] as string[] }
const a = (id: string, code: string, name: string, type: string, balance: number, parentId: string | null = null, extra: Partial<Account> = {}): Account => ({
  ...base, id, code, name, type, balance, parentId, ...extra,
})

let accounts: Account[] = [
  a('1100', '1-1000', 'Kas & Setara Kas', 'Kas & Bank', 186_450_000),
  a('1101', '1-1001', 'Kas Kecil', 'Kas & Bank', 4_250_000, '1100'),
  a('1102', '1-1002', 'Bank BCA', 'Kas & Bank', 132_700_000, '1100', { bank: 'BCA', accNo: '5410 2288 19', accName: 'PT Harbor Nusantara' }),
  a('1103', '1-1003', 'Bank Mandiri', 'Kas & Bank', 49_500_000, '1100', { bank: 'Mandiri', accNo: '122 000 4471 902', accName: 'PT Harbor Nusantara' }),
  a('1200', '1-2000', 'Piutang Usaha', 'Piutang Usaha', 98_320_000),
  a('1300', '1-3000', 'Persediaan Barang Dagang', 'Persediaan', 241_875_000),
  a('1500', '1-5000', 'Aset Tetap', 'Aset Tetap', 412_000_000),
  a('1501', '1-5001', 'Kendaraan', 'Aset Tetap', 285_000_000, '1500'),
  a('1502', '1-5002', 'Peralatan Kantor', 'Aset Tetap', 127_000_000, '1500'),
  a('2100', '2-1000', 'Utang Usaha', 'Utang Usaha', -76_540_000),
  a('3100', '3-1000', 'Modal Disetor', 'Ekuitas', -750_000_000),
  a('4100', '4-1000', 'Pendapatan Penjualan', 'Pendapatan', -1_245_600_000),
  a('6100', '6-1000', 'Beban Gaji', 'Beban', 312_450_000),
  a('6200', '6-2000', 'Beban Sewa', 'Beban', 84_000_000),
]

export const accountUsers = ['Dhiaz Fathra', 'Arif Santoso', 'Rina Wulandari', 'Budi Hartono']
export const bankOptions = ['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB Niaga']

export const accountsQuery = queryOptions({ queryKey: ['accounts'], queryFn: () => mock(accounts) })
export const useAccounts = () => useQuery(accountsQuery)

function fromInput(id: string, v: AccountInput, balance: number): Account {
  const { isSub, parentId, ...rest } = v
  return { ...rest, id, parentId: isSub ? parentId : null, balance }
}

export function useSaveAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: AccountInput }) => {
      const old = accounts.find((x) => x.id === id)
      const acc = fromInput(old?.id ?? `acc-${Date.now()}`, input, old?.balance ?? input.opening)
      accounts = old ? accounts.map((x) => (x.id === acc.id ? acc : x)) : [...accounts, acc]
      return mock(acc, 400)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      accounts = accounts.filter((x) => x.id !== id && x.parentId !== id)
      return mock(null, 300)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

/** Parents first, children right after, with depth for indentation. */
export function toTree(list: Account[]) {
  const out: (Account & { depth: number })[] = []
  const walk = (pid: string | null, depth: number) =>
    list.filter((x) => x.parentId === pid).sort((x, y) => x.code.localeCompare(y.code)).forEach((x) => (out.push({ ...x, depth }), walk(x.id, depth + 1)))
  walk(null, 0)
  return out
}
