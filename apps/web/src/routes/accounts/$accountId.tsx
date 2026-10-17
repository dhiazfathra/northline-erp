import { createFileRoute } from '@tanstack/react-router'
import { AccountForm } from '@/features/accounts/form'

export const Route = createFileRoute('/accounts/$accountId')({ component: EditAccount })

function EditAccount() {
  const { accountId } = Route.useParams()
  return <AccountForm id={accountId} />
}
