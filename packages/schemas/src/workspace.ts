import { z } from 'zod'

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  alias: z.string(),
  type: z.string(),
  role: z.string(),
  lastOpened: z.string(),
  color: z.string(),
})
export type Workspace = z.infer<typeof workspaceSchema>

export const inviteSchema = z.object({
  id: z.string(),
  workspace: z.string(),
  invitedBy: z.string(),
})
export type Invite = z.infer<typeof inviteSchema>

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1),
  alias: z.string().trim().max(20).optional(),
  type: z.string().min(1),
  industry: z.string().min(1),
  employees: z.string().min(1),
})
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>
