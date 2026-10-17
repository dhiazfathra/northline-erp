import { createFileRoute } from '@tanstack/react-router'
import { AssetList } from '@/features/asset-modules/asset-list'

export const Route = createFileRoute('/asset-modules/')({ component: AssetList })
