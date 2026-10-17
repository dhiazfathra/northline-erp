import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/accounts/$accountId')({ component: () => <div className="p-8">TODO /accounts/$accountId</div> })
