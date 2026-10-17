import { createFileRoute } from '@tanstack/react-router'
import { ModuleList } from '@/features/overview/module-list'

export const Route = createFileRoute('/modules/$moduleId')({ component: ModuleListPage })

function ModuleListPage() {
  const { moduleId } = Route.useParams()
  return <ModuleList key={moduleId} moduleId={moduleId} />
}
