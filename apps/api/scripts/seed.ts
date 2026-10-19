// Migrates and seeds a database (Neon prod or local) with one Data Usaha's fixtures + one login (ADR-0032: one
// instance per company, so sandboxes never mix). Idempotent: commands carry idempotency keys, master rows upsert.
// NL_PROFILE=manufaktur|retail|trade|contractor DATABASE_URL=… NL_EMAIL=… NL_PASSWORD=… bun scripts/seed.ts
import { sql } from 'drizzle-orm'
import { createUser } from '../src/auth'
import { connect, migrate } from '../src/db'
import { catchUp, projections } from '../src/projections'

export const PROFILES = ['manufaktur', 'retail', 'trade', 'contractor'] as const
const profile = process.env.NL_PROFILE ?? 'manufaktur'
if (!(PROFILES as readonly string[]).includes(profile)) throw new Error(`NL_PROFILE must be one of ${PROFILES.join(', ')}`)
const { client, db } = connect()
const sync = async () => { for (const p of projections) await catchUp(db, p) }
await migrate(client)
await (await import(`./seed/${profile}.ts`)).default(db, sync)
await sync()

const [email, password] = [process.env.NL_EMAIL, process.env.NL_PASSWORD]
if (email && password) {
  const [u] = await db.execute(sql`SELECT 1 FROM users WHERE email = ${email.toLowerCase()}`)
  if (!u) await createUser(db, email, password)
}
const [n] = await db.execute(sql`SELECT (SELECT count(*) FROM events) AS events, (SELECT count(*) FROM journals) AS journals, (SELECT count(*) FROM customers) AS customers`)
console.log('seeded', profile, n)
await client.end()
