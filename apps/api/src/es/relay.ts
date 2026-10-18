import { sql } from 'drizzle-orm'
import type { PgBoss } from 'pg-boss'
import type { Db } from '../db'

/** Moves pending outbox rows to pg-boss. At-least-once: a crash after send and before the update re-sends. */
export async function relayOutbox(db: Db, boss: PgBoss, batch = 100): Promise<number> {
  return db.transaction(async tx => {
    const rows = await tx.execute(sql`SELECT id, topic, payload FROM outbox WHERE relayed_at IS NULL ORDER BY id LIMIT ${batch} FOR UPDATE SKIP LOCKED`)
    for (const r of rows) {
      await boss.createQueue(r.topic as string).catch(() => {})
      await boss.send(r.topic as string, r.payload as object, { singletonKey: String(r.id) })
    }
    if (rows.length) await tx.execute(sql`UPDATE outbox SET relayed_at = now() WHERE id IN ${rows.map(r => r.id)}`)
    return rows.length
  })
}
