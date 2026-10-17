import { createFileRoute } from '@tanstack/react-router'
import { CreateWorkspaceForm } from '@/features/workspaces/create-form'
import { WorkspaceSwitcher } from '@/features/workspaces/switcher'

export const Route = createFileRoute('/workspaces/new')({
  component: () => (
    <>
      <WorkspaceSwitcher creating />
      <CreateWorkspaceForm />
    </>
  ),
})
