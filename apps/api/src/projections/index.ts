import { sql } from 'drizzle-orm'
import type { Db, Tx } from '../db'
import { readAll, type StoredEvent } from '../es/store'

export interface Projection {
  name: string
  /** Read-model tables this projection owns; truncated on rebuild. */
  tables: string[]
  apply(tx: Tx, e: StoredEvent): Promise<void>
}

const day = (date: string) => date
const period = (date: string) => date.slice(0, 7)

/** journals + journal_lines + account_daily_balances + period_summaries. */
export const ledgerProjection: Projection = {
  name: 'ledger',
  tables: ['account_daily_balances', 'period_summaries', 'journal_lines', 'journals'],
  async apply(tx, e) {
    if (e.type === 'JournalPosted') {
      const d = e.data
      await tx.execute(sql`INSERT INTO journals (journal_id, number, date, description, reverses, global_position)
        VALUES (${d.journalId}, ${d.number ?? null}, ${d.date}, ${d.description}, ${d.reverses ?? null}, ${e.globalPosition})`)
      let total = 0
      for (const [i, l] of d.lines.entries()) {
        const debit = l.side === 'DEBIT' ? l.amount : 0, credit = l.side === 'CREDIT' ? l.amount : 0
        total += debit
        await tx.execute(sql`INSERT INTO journal_lines (journal_id, line_no, date, account_no, debit, credit, memo)
          VALUES (${d.journalId}, ${i + 1}, ${d.date}, ${l.account}, ${debit}, ${credit}, ${l.memo ?? null})`)
        await tx.execute(sql`INSERT INTO account_daily_balances (account_no, date, debit, credit) VALUES (${l.account}, ${day(d.date)}, ${debit}, ${credit})
          ON CONFLICT (account_no, date) DO UPDATE SET debit = account_daily_balances.debit + EXCLUDED.debit, credit = account_daily_balances.credit + EXCLUDED.credit`)
      }
      await tx.execute(sql`INSERT INTO period_summaries (period, debit, credit, journals) VALUES (${period(d.date)}, ${total}, ${total}, 1)
        ON CONFLICT (period) DO UPDATE SET debit = period_summaries.debit + EXCLUDED.debit, credit = period_summaries.credit + EXCLUDED.credit, journals = period_summaries.journals + 1`)
    } else if (e.type === 'JournalReversed') {
      await tx.execute(sql`UPDATE journals SET reversed_by = ${e.data.reversalJournalId} WHERE journal_id = ${e.data.journalId}`)
    } else if (e.type === 'PeriodClosed' || e.type === 'PeriodReopened') {
      await tx.execute(sql`INSERT INTO period_summaries (period, closed) VALUES (${e.data.period}, ${e.type === 'PeriodClosed'})
        ON CONFLICT (period) DO UPDATE SET closed = EXCLUDED.closed`)
    }
  },
}

export const projections: Projection[] = [ledgerProjection]

/**
 * Applies new events to one projection, a batch per transaction, checkpoint advanced in the same transaction
 * so a crash never double-applies. Returns the number of events applied.
 */
export async function catchUp(db: Db, p: Projection, batch = 500): Promise<number> {
  let applied = 0
  for (;;) {
    const n = await db.transaction(async tx => {
      await tx.execute(sql`INSERT INTO projection_checkpoints (projection) VALUES (${p.name}) ON CONFLICT DO NOTHING`)
      const [cp] = await tx.execute(sql`SELECT global_position FROM projection_checkpoints WHERE projection = ${p.name} FOR UPDATE`)
      const events = await readAll(tx, Number(cp!.global_position), batch)
      for (const e of events) await p.apply(tx, e)
      if (events.length) await tx.execute(sql`UPDATE projection_checkpoints SET global_position = ${events.at(-1)!.globalPosition}, updated_at = now() WHERE projection = ${p.name}`)
      return events.length
    })
    applied += n
    if (n < batch) return applied
  }
}

/** Drops a projection's read models and replays every event from position 0. */
export async function rebuild(db: Db, p: Projection) {
  await db.transaction(async tx => {
    await tx.execute(sql.raw(`TRUNCATE ${p.tables.join(', ')}`))
    await tx.execute(sql`DELETE FROM projection_checkpoints WHERE projection = ${p.name}`)
  })
  return catchUp(db, p)
}

/** Read-your-writes: waits until every projection has reached `position`. */
export async function waitFor(db: Db, position: number, timeoutMs = 5000) {
  const until = Date.now() + timeoutMs
  for (;;) {
    const [r] = await db.execute(sql`SELECT COALESCE(MIN(global_position), 0) AS p FROM projection_checkpoints`)
    if (Number(r!.p) >= position) return
    if (Date.now() > until) throw new Error(`Projections behind position ${position}`)
    await Bun.sleep(50)
  }
}
