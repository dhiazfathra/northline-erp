// One Neon branch per Data Usaha (ADR-0036); the single Worker serves whichever branch DATABASE_URL points at.
import { $ } from 'bun'

export const BRANCH = { manufaktur: 'production', retail: 'prod-retail', trade: 'prod-trade', contractor: 'prod-contractor' } as const
export const neonUrl = async (p: keyof typeof BRANCH, pooled = false) =>
  (await $`neon connection-string ${BRANCH[p]} --project-id autumn-paper-67811977 ${pooled ? ['--pooled'] : []}`.quiet().text()).trim()
