// On-demand production deploy (ADR-0017): migrate + seed Neon first, then the Worker (order matters, docs/risks.md R1).
// Run from the repo root (`pnpm deploy:prod`) so Bun loads ./.env; local dev never touches NEON_* URLs.
import { $ } from 'bun'

const url = process.env.NEON_DATABASE_URL_UNPOOLED
if (!url) throw new Error('NEON_DATABASE_URL_UNPOOLED missing from .env')
if (prompt(`Deploy to production (Neon ${new URL(url).hostname} + Cloudflare Worker)? [y/N]`)?.toLowerCase() !== 'y') process.exit(1)

await $`pnpm --filter web build`
await $`bun apps/api/scripts/seed.ts`.env({ ...process.env, DATABASE_URL: url })
await $`npx wrangler deploy`.cwd('apps/api')
