import { createFileRoute } from '@tanstack/react-router'
import { AiHistory } from '@/features/ai/ai-history'

export const Route = createFileRoute('/ai/history')({ component: AiHistory })
