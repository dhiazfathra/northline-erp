import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/modules/$moduleId')({ component: () => <div className="p-8">TODO /modules/$moduleId</div> })
