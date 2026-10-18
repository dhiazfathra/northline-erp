import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import m0001 from '../migrations/0001_ledger.sql' with { type: 'text' }
import m0002 from '../migrations/0002_number_sequences.sql' with { type: 'text' }
import m0003 from '../migrations/0003_auth.sql' with { type: 'text' }

export function connect(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL is required')
  const client = postgres(url, { max: 10, onnotice: () => {} })
  return { client, db: drizzle(client) }
}
export type Db = ReturnType<typeof connect>['db']
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

// Embedded so `bun build --compile` carries them; add new files here in order.
const MIGRATIONS: Record<string, string> = { '0001_ledger.sql': m0001, '0002_number_sequences.sql': m0002, '0003_auth.sql': m0003 }

/** Applies migrations in name order, once each. Hand-written SQL because triggers and deferred constraints are the point. */
export async function migrate(client: postgres.Sql) {
  await client`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`
  const done = new Set((await client`SELECT name FROM _migrations`).map(r => r.name as string))
  for (const f of Object.keys(MIGRATIONS).sort()) {
    if (done.has(f)) continue
    await client.begin(async tx => {
      await tx.unsafe(MIGRATIONS[f]!)
      await tx`INSERT INTO _migrations (name) VALUES (${f})`
    })
  }
}
