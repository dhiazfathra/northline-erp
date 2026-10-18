import { connect } from './db'
import { createApp } from './app'
import { catchUp, projections } from './projections'

// Cloudflare Workers entry (ADR-0017). Static assets serve the SPA; only /api/* reaches this code.
// No long-lived worker loop and no cron: projections catch up inline after each write so Neon can scale to zero.
export default {
  async fetch(req: Request, env: { DATABASE_URL: string }, ctx: { waitUntil(p: Promise<unknown>): void }) {
    const { client, db } = connect(env.DATABASE_URL, { max: 5, prepare: false })
    try {
      const res = await createApp(db).fetch(req)
      if (req.method !== 'GET' && res.ok) for (const p of projections) await catchUp(db, p)
      return res
    } finally {
      ctx.waitUntil(client.end({ timeout: 1 }))
    }
  },
}
