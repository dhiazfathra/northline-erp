// On-demand production deploy (ADR-0017, ADR-0036): migrate + seed each profile's Neon branch first, then the Worker
// (order matters, docs/risks.md R1). Run from the repo root (`pnpm deploy:prod`) so Bun loads ./.env; needs `neon` CLI auth.
import { $ } from 'bun'
import { BRANCH, neonUrl } from './neon-branches'

const only = process.argv[2] as keyof typeof BRANCH | undefined
if (only && !BRANCH[only]) throw new Error(`profile must be one of ${Object.keys(BRANCH).join(', ')}`)
const targets = only ? [only] : (Object.keys(BRANCH) as (keyof typeof BRANCH)[])
if (prompt(`Deploy production (Neon branches ${targets.map(p => BRANCH[p]).join(', ')} + Cloudflare Worker)? [y/N]`)?.toLowerCase() !== 'y') process.exit(1)
await $`pnpm --filter web build`
for (const p of targets) await $`bun apps/api/scripts/seed.ts`.env({ ...process.env, NL_PROFILE: p, DATABASE_URL: await neonUrl(p) })
await $`npx wrangler deploy`.cwd('apps/api')
