import { createFileRoute } from '@tanstack/react-router'
import { TrialBalance } from '@/features/ledger/trial-balance'

export const Route = createFileRoute('/ledger/trial-balance')({ component: TrialBalance })
