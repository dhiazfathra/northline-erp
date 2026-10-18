import { hc } from 'hono/client'
import type { AppType } from '../../../api/types/app'

// Same origin in production (the API binary serves this SPA); Vite proxies /api in dev. Session is an httpOnly cookie.
export const api = hc<AppType>('/', { init: { credentials: 'same-origin' } }).api
