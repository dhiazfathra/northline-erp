import { createFileRoute } from '@tanstack/react-router'
import { Reconciliation } from '@/features/ledger/reconciliation'

export const Route = createFileRoute('/cash-bank/reconciliation')({ component: Reconciliation })
