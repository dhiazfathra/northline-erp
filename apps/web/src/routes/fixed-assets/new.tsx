import { createFileRoute } from '@tanstack/react-router'
import { AssetForm } from '@/features/fixed-assets/asset-form'

export const Route = createFileRoute('/fixed-assets/new')({ component: () => <AssetForm /> })
