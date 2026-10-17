import type { CreateWorkspaceInput, Invite, Workspace } from '@northline/schemas'
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mock } from './mock'

const workspaces: Workspace[] = [
  { id: 'harbor', name: 'PT Harbor Nusantara', alias: 'Harbor', type: 'Dagang', role: 'Pemilik', lastOpened: '17/10/2026', color: '#ec4899' },
  { id: 'kerr', name: 'Kerr Consulting', alias: 'Kerr', type: 'Jasa', role: 'Administrator', lastOpened: '12/10/2026', color: '#a855f7' },
  { id: 'lumen', name: 'CV Lumen Abadi', alias: 'Lumen', type: 'Manufaktur', role: 'Akuntan', lastOpened: '30/09/2026', color: '#38bdf8' },
  { id: 'tidal', name: 'Tidal Logistics', alias: 'Tidal', type: 'Jasa', role: 'Viewer', lastOpened: '02/09/2026', color: '#f59e0b' },
]
const invites: Invite[] = [{ id: 'inv-1', workspace: 'PT Sinar Pesisir', invitedBy: 'Arif Santoso', role: 'Akuntan' }]
let currentId = 'harbor'

export const workspacesQuery = queryOptions({ queryKey: ['workspaces'], queryFn: () => mock(workspaces) })
export const invitesQuery = queryOptions({ queryKey: ['invites'], queryFn: () => mock(invites) })
export const currentWorkspaceQuery = queryOptions({
  queryKey: ['workspaces', 'current'],
  queryFn: () => mock(workspaces.find((w) => w.id === currentId)!, 0),
})

export const useCurrentWorkspace = () => useQuery(currentWorkspaceQuery)

export function useSwitchWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      currentId = id
      return mock(id, 200)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  })
}

export function useRespondInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const i = invites.findIndex((x) => x.id === id)
      const [inv] = invites.splice(i, 1)
      if (accept && inv)
        workspaces.push({ id: inv.id, name: inv.workspace, alias: inv.workspace, type: 'Dagang', role: inv.role, lastOpened: '—', color: '#22c55e' })
      return mock(null, 200)
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateWorkspaceInput) => {
      const ws: Workspace = { id: `ws-${workspaces.length + 1}`, name: input.name, alias: input.alias, type: input.type, role: 'Pemilik', lastOpened: '17/10/2026', color: '#ec4899' }
      workspaces.push(ws)
      currentId = ws.id
      return mock(ws, 500)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  })
}
