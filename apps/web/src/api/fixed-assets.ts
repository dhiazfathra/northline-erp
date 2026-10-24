import type { AssetExpense, FixedAsset, FixedAssetForm } from '@northline/schemas/fixed-assets'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { journals } from '@northline/schemas/fixtures'

export const categories = ['Peralatan Kantor', 'Kendaraan', 'Bangunan', 'Mesin & Peralatan']
// Month-end depreciation is straight line only; other methods return when the API computes them.
export const methods = ['Garis Lurus']
export const codeTypes = ['FA — Aset Tetap']
export const departments = ['Umum', 'Keuangan', 'Operasional', 'Penjualan', 'TI']

/** Fixture journals posted for an asset (its history). */
export const assetJournals = (code: string) => journals.filter((j) => j.source === 'Aset Tetap' && j.no === code)

export const assetTotal = (a: { expenses: AssetExpense[] }) => a.expenses.reduce((s, x) => s + x.amount, 0)

type ApiAsset = {
  number: string; description: string; category: string; date: string; usageDate: string; lifeMonths: number
  assetAccount: string; accumulatedAccount: string; expenseAccount: string
  location: string; department: string; note: string; tax: boolean; qty: number; salvage: number; status: 'active' | 'disposed'; lastDep: string
  expenditures: { name: string; date: string; amount: number; account: string }[]
}

// Plain fetch: GET list/one live on a sub-app and PUT/DELETE are not on the typed chain.
async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/fixed-assets${path}`, { method, credentials: 'same-origin', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? `Aset tetap gagal (${res.status})`)
  return res.json() as Promise<T>
}

// The expense row's credit account rides in `code`, the form has no account field; new rows credit Ekuitas Saldo Awal like the old fixture.
const toAsset = (a: ApiAsset): FixedAsset => ({
  id: a.number, code: a.number, name: a.description, autoCode: false, codeType: '', buy: a.date, use: a.usageDate, intangible: false, method: 'Garis Lurus',
  category: a.category, assetAccount: a.assetAccount, accumAccount: a.accumulatedAccount, expenseAccount: a.expenseAccount, qty: a.qty,
  years: Math.floor(a.lifeMonths / 12), months: a.lifeMonths % 12, salvage: a.salvage,
  expenses: a.expenditures.map((e) => ({ code: e.account, desc: e.name, date: e.date, amount: e.amount })),
  location: a.location, department: a.department, note: a.note, tax: a.tax, files: [], status: a.status, lastDep: a.lastDep,
})
const toInput = (d: FixedAssetForm) => ({
  idempotencyKey: crypto.randomUUID(), number: d.autoCode ? undefined : d.code, description: d.name, category: d.category, date: d.buy, usageDate: d.use,
  lifeMonths: d.years * 12 + d.months, assetAccount: d.assetAccount, accumulatedAccount: d.accumAccount, expenseAccount: d.expenseAccount,
  location: d.location, department: d.department, note: d.note, tax: d.tax, qty: d.qty, salvage: d.salvage,
  expenditures: d.expenses.map((e) => ({ name: e.desc, date: e.date, amount: e.amount, account: /^\d+$/.test(e.code) ? e.code : '300001' })),
})

export const fixedAssetsQuery = queryOptions({ queryKey: ['fixed-assets'], queryFn: async () => (await call<ApiAsset[]>('GET', '')).map(toAsset) })
export const fixedAssetQuery = (id: string) =>
  queryOptions({ queryKey: ['fixed-assets', id], queryFn: () => call<ApiAsset>('GET', `/${encodeURIComponent(id)}`).then(toAsset, () => null) })

export function useSaveFixedAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: FixedAssetForm }) => {
      const { number } = await call<{ number: string }>(id ? 'PUT' : 'POST', id ? `/${encodeURIComponent(id)}` : '', toInput(data))
      return toAsset(await call<ApiAsset>('GET', `/${encodeURIComponent(number)}`))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fixed-assets'] }),
  })
}

export function useDeleteFixedAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => call<{ number: string }>('DELETE', `/${encodeURIComponent(id)}`, { idempotencyKey: crypto.randomUUID() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fixed-assets'] }),
  })
}
