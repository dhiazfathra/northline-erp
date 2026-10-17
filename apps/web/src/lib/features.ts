import { useQuery } from '@tanstack/react-query'
import { featuresQuery } from '@/api/ledger'

/** Ids of Preferensi features that are switched on. */
export function useEnabledFeatures() {
  const { data } = useQuery(featuresQuery)
  return new Set((data ?? []).filter((f) => f.on).map((f) => f.id))
}
