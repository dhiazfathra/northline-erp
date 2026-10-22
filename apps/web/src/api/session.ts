import type { QueryClient } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api } from './client'

/** Who is signed in; null when the session cookie is missing or expired (GET /api/me answers 401). */
export const meQuery = {
  queryKey: ['me'],
  queryFn: async () => {
    const res = await api.me.$get()
    return res.ok ? await res.json() : null
  },
  staleTime: 60_000,
}

export const signedIn = async (qc: QueryClient) => (await qc.fetchQuery(meQuery)) !== null

/** Ends the session on the server (the row is deleted, so a copied cookie stops working), then drops cached data. */
export function useSignOut() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return async () => {
    await api.auth.logout.$post().catch(() => undefined)
    qc.clear()
    navigate({ to: '/auth' })
  }
}
