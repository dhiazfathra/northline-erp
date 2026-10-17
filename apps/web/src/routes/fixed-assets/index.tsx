import { createFileRoute } from '@tanstack/react-router'
import { AssetList } from '@/features/fixed-assets/asset-list'

export const Route = createFileRoute('/fixed-assets/')({ component: AssetList })
