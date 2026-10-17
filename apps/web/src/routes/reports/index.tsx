import { createFileRoute } from '@tanstack/react-router'
import { ReportList } from '@/features/reports/report-list'

export const Route = createFileRoute('/reports/')({ component: ReportList })
