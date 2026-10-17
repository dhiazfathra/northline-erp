import { reportSearchSchema } from '@northline/schemas/reports'
import { createFileRoute } from '@tanstack/react-router'
import { ReportView } from '@/features/reports/report-view'

export const Route = createFileRoute('/reports/$reportId')({
  validateSearch: reportSearchSchema,
  component: ReportPage,
})

function ReportPage() {
  const { reportId } = Route.useParams()
  const search = Route.useSearch()
  return <ReportView key={reportId} id={reportId} search={search} />
}
