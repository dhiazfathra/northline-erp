import { createFileRoute } from '@tanstack/react-router'
import { Preferences } from '@/features/ledger/preferences'

export const Route = createFileRoute('/settings/preferences')({ component: Preferences })
