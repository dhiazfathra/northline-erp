import type { Account, AccountInput } from '@northline/schemas/accounts'
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accounts as fixtureAccounts, journals, naturalBalance, parseDate } from '@northline/schemas/fixtures'
import { mock } from './mock'

const base = { note: '', bank: '', accNo: '', accName: '', opening: 0, openDate: '2026-01-01', allUsers: true, users: [] as string[] }
let accounts: Account[] = fixtureAccounts.map((x) => ({ ...base, id: x.code, code: x.code, name: x.name, type: x.type, parentId: x.parent ?? null, balance: naturalBalance(x.code), contra: x.contra }))

/** Journal lines posted to an account or any of its descendants, oldest first. */
export function accountLines(code: string) {
  const own = (c: string): boolean => !!c && (c === code || own(fixtureAccounts.find((x) => x.code === c)?.parent ?? ''))
  return journals
    .flatMap((j) => j.lines.filter((l) => own(l.account)).map((l) => ({ ...l, jv: j.jv, no: j.no, date: j.date, description: j.description })))
    .sort((x, y) => parseDate(x.date) - parseDate(y.date))
}

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
