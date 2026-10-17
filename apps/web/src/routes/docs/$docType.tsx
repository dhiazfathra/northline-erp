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
  component: Page,
})

function Page() {
  const { docType } = Route.useParams()
  return <DocScreen key={docType} type={docType} />
}
