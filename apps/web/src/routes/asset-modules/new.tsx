import { createFileRoute } from '@tanstack/react-router'
import { AssetForm } from '@/features/asset-modules/asset-form'

export const Route = createFileRoute('/asset-modules/new')({ component: AssetForm })
