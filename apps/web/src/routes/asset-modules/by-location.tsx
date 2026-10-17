import { createFileRoute } from '@tanstack/react-router'
import { AssetsByLocation } from '@/features/asset-modules/by-location'

export const Route = createFileRoute('/asset-modules/by-location')({ component: AssetsByLocation })
