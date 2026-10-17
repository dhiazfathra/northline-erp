import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/docs/$docType')({ component: () => <div className="p-8">TODO /docs/$docType</div> })
