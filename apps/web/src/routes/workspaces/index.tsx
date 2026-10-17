import { createFileRoute } from '@tanstack/react-router'
import { WorkspaceSwitcher } from '@/features/workspaces/switcher'

export const Route = createFileRoute('/workspaces/')({ component: () => <WorkspaceSwitcher /> })
