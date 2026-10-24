import type { AssetExpenditure, AssetExpenditureForm, AssetLocation } from '@northline/schemas/asset-modules'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { fixedAssetsQuery } from './fixed-assets'

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/fixed-assets/${path}`, { credentials: 'same-origin', ...init })
  if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? `Pengeluaran aset gagal (${res.status})`)
  return res.json() as Promise<T>
}

/** Asset picker: the live fixed-asset register, code + name. */
export const assetOptionsQuery = queryOptions({ ...fixedAssetsQuery, select: (xs) => xs.map((a) => ({ code: a.code, name: a.name })) })
/** Branch names with 'Semua' (all) first. */
export const branchesQuery = queryOptions({ queryKey: ['branches'], queryFn: async () => ['Semua', ...(await call<string[]>('branches'))] })

export const assetExpendituresQuery = queryOptions({ queryKey: ['asset-modules'], queryFn: () => call<AssetExpenditure[]>('expenditures') })
export const assetLocationsQuery = (branch: string, date: string) =>
  queryOptions({
    queryKey: ['asset-modules', 'by-location', branch, date],
    queryFn: () => call<AssetLocation[]>(`locations?${new URLSearchParams(branch === 'Semua' ? { date } : { branch, date })}`),
  })

export function useCreateAssetExpenditure() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (f: AssetExpenditureForm) => {
      const [d, m, y] = f.date.split('/')
      const body = { idempotencyKey: crypto.randomUUID(), date: `${y}-${m}-${d}`, description: f.description, assetCode: f.assetCode, note: f.note, dpp: Number(f.dpp || 0), applyDp: f.applyDp,
        lines: f.lines.map((l) => ({ code: l.code, qty: Number(l.qty), note: l.note })) }
      const { number } = await call<{ number: string }>('expenditures', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      return { number }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asset-modules'] }),
  })
}
