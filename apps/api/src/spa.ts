import type { Context } from 'hono'
import { assets } from './spa.generated'

const types: Record<string, string> = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', woff2: 'font/woff2', json: 'application/json', ico: 'image/x-icon' }

/** Serves apps/web/dist embedded by scripts/embed-spa.ts; unknown paths get index.html for the client router. */
export async function serveSpa(c: Context) {
  const path = c.req.path.replace(/^\//, '') || 'index.html'
  const file = assets[path] ?? assets['index.html']
  if (!file) return c.text('SPA not embedded; run `bun run build`', 404)
  const name = assets[path] ? path : 'index.html'
  return new Response(Bun.file(file), {
    headers: {
      'content-type': types[name.split('.').pop()!] ?? 'application/octet-stream',
      'cache-control': name.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    },
  })
}
