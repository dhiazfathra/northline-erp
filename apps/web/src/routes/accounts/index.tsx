import { createFileRoute } from '@tanstack/react-router'
import { AccountsList } from '@/features/accounts/list'

export const Route = createFileRoute('/accounts/')({ component: AccountsList })
