// Repoints the production Worker at one profile's Neon branch (ADR-0036). `pnpm switch:prod retail`
// The pooled URL goes straight from the neon CLI into the Worker secret, never to stdout.
import { $ } from 'bun'
import { BRANCH, neonUrl } from './neon-branches'

const p = process.argv[2] as keyof typeof BRANCH
if (!BRANCH[p]) throw new Error(`usage: pnpm switch:prod <${Object.keys(BRANCH).join('|')}>`)
const url = await neonUrl(p, true)
await $`npx wrangler secret put DATABASE_URL < ${new Response(url)}`.cwd('apps/api')
console.log(`Worker now serves ${p} (Neon branch ${BRANCH[p]})`)
