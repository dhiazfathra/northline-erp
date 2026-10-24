import { docTypeSchema } from '@northline/schemas/docs'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { DocScreen } from '@/features/docs/doc-screen'

export const Route = createFileRoute('/docs/$docType')({
  params: {
    parse: ({ docType }) => {
      const r = docTypeSchema.safeParse(docType)
      if (!r.success) throw notFound()
      return { docType: r.data }
    },
  },
  // ?new=1 opens a blank form on arrival (the overview's quick entry hands off here)
  validateSearch: (s: Record<string, unknown>): { new?: 1 } => (s.new ? { new: 1 } : {}),
  component: Page,
})

function Page() {
  const { docType } = Route.useParams()
  const { new: fresh } = Route.useSearch()
  return <DocScreen key={docType} type={docType} fresh={!!fresh} />
}
