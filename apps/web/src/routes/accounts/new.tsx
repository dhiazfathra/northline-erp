import { createFileRoute } from '@tanstack/react-router'
import { AccountForm } from '@/features/accounts/form'

export const Route = createFileRoute('/accounts/new')({ component: () => <AccountForm /> })
