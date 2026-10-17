import { createFileRoute } from '@tanstack/react-router'
import { MonthEnd } from '@/features/ledger/month-end'

export const Route = createFileRoute('/ledger/month-end')({ component: MonthEnd })
