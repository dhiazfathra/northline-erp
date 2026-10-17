import { createFileRoute } from '@tanstack/react-router'
import { AssetForm } from '@/features/fixed-assets/asset-form'

export const Route = createFileRoute('/fixed-assets/$assetId')({ component: AssetDetail })

function AssetDetail() {
  const { assetId } = Route.useParams()
  return <AssetForm id={assetId} />
}
