import type { ListRow, NewTxInput, Overview } from '@northline/schemas/overview'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

const iso = (d: Date) => d.toISOString().slice(0, 10)
/** The overview's period picker (English labels) as an inclusive from/to window ending today. */
export function periodRange(period: string, today = new Date()): { from: string; to: string } {
  const from = new Date(today)
  if (period === 'Past 7 days') from.setUTCDate(from.getUTCDate() - 6)
  else if (period === 'Past 30 days') from.setUTCDate(from.getUTCDate() - 29)
  else if (period === 'This quarter') from.setUTCMonth(Math.floor(from.getUTCMonth() / 3) * 3, 1)
  return { from: iso(from), to: iso(today) }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api/web/${path}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Permintaan gagal (${res.status})`)
  return res.json() as Promise<T>
}

export const overviewQuery = (period: string) =>
  queryOptions({ queryKey: ['overview', period], queryFn: () => get<Overview>(`overview?${new URLSearchParams(periodRange(period))}`) })
export const moduleListQuery = (moduleId: string) =>
  queryOptions({
    queryKey: ['module-list', moduleId],
    // Modules without a list endpoint show an empty list, as before.
    queryFn: () => (['customers', 'vendors', 'items', 'taxes'].includes(moduleId) ? get<ListRow[]>(`modules/${moduleId}`) : Promise.resolve<ListRow[]>([])),
  })

export const useOverview = (period: string) => useQuery(overviewQuery(period))
export const useModuleList = (moduleId: string) => useQuery(moduleListQuery(moduleId))

/** Quick entry has no items, accounts or party codes, which every create route needs: it opens the full document form instead. */
const docFor = { invoice: 'sales-invoice', bill: 'purchase-invoice', receipt: 'sales-receipt', payment: 'purchase-payment', journal: 'journal' } as const
export function useOpenTxForm() {
  const navigate = useNavigate()
  return (type: NewTxInput['type']) => navigate({ to: '/docs/$docType', params: { docType: docFor[type] }, search: { new: 1 } })
}
