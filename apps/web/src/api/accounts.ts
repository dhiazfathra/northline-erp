import { accountTypeLabel, type Account, type AccountInput } from '@northline/schemas/accounts'
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { ledgerApi } from './ledger'

export const accountUsers = ['Dhiaz Fathra', 'Arif Santoso', 'Rina Wulandari', 'Budi Hartono']
export const bankOptions = ['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB Niaga']

const dmy = (iso: string) => iso.split('-').reverse().join('/')
const fail = async (res: Response, what: string) => {
  if (res.ok) return
  const b = (await res.json().catch(() => ({}))) as { error?: string; issues?: { message: string }[] }
  throw new Error(b.issues?.[0]?.message ?? b.error ?? `${what} (${res.status})`)
}
// Projection position of the last account command, so the refetch waits until the accounts table has it.
let after = 0

// Opening balance is entered as a Jurnal Umum (the form says so), so the account itself carries none.
const noOpening = { opening: 0, openDate: '' }
export const accountsQuery = queryOptions({
  queryKey: ['accounts'],
  queryFn: async (): Promise<Account[]> => {
    const res = await ledgerApi.accounts.$get({ query: { after: String(after) } })
    await fail(res, 'Akun gagal dimuat')
    return (await res.json()).map((a) => ({
      ...a, ...noOpening, id: a.no, code: a.no, name: a.name, type: accountTypeLabel[a.type], parentId: a.parentNo, balance: a.balance / 100, contra: a.type === 'ACCUMULATED_DEPRECIATION',
    }))
  },
})
export const useAccounts = () => useQuery(accountsQuery)
/** Postable accounts (nothing rolls up into them), for the account pickers. */
export const useLeafAccounts = () => useQuery({ ...accountsQuery, select: (all) => all.filter((a) => !all.some((c) => c.parentId === a.id)) }).data ?? []

/** Journal lines posted to an account or any of its descendants, oldest first (cents → rupiah). */
export const useAccountLines = (code: string) =>
  useQuery({
    queryKey: ['accounts', code, 'lines'],
    enabled: !!code,
    queryFn: async () => {
      const res = await ledgerApi.accounts[':no'].lines.$get({ param: { no: code } })
      await fail(res, 'Transaksi akun gagal dimuat')
      return (await res.json()).map((l) => ({ jv: l.number, no: l.number, date: dmy(l.date), description: l.description, debit: l.debit / 100, credit: l.credit / 100 }))
    },
  })

const command = async (body: Record<string, unknown>) => {
  const res = await api.ledger.commands.$post({ json: { idempotencyKey: crypto.randomUUID(), ...body } as never })
  await fail(res, 'Gagal menyimpan')
  after = Math.max(after, ((await res.json()) as { globalPosition: number }).globalPosition)
}
const typeOf = (label: string) => Object.entries(accountTypeLabel).find(([, l]) => l === label)?.[0]

export function useSaveAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: AccountInput }) => {
      // the ledger keys accounts by number and only renames an open account; the form locks code, type and parent on edit
      if (!id) await command({ type: 'OpenAccount', no: input.code, name: input.name, accountType: typeOf(input.type), parentNo: input.isSub ? input.parentId : undefined })
      else await command({ type: 'RenameAccount', no: id, name: input.name })
      const { note, bank, accNo, accName, allUsers, users } = input
      const res = await ledgerApi.accounts[':no'].details.$put({ param: { no: id ?? input.code }, json: { note, bank, accNo, accName, allUsers, users } } as never)
      await fail(res, 'Detail akun gagal disimpan')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => command({ type: 'DeleteAccount', no: id }),
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
