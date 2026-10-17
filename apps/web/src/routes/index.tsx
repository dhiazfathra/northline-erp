import { createFileRoute } from '@tanstack/react-router'
import { OverviewScreen } from '@/features/overview/overview'

export const Route = createFileRoute('/')({ component: OverviewScreen })
