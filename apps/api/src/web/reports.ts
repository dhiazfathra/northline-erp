import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { trialBalanceQuery } from '@northline/schemas/ledger-es'
import type { AuthEnv } from '../auth'
import type { Db } from '../db'
import { typeLabel } from '../reports/general-ledger'
import { loadJournals } from '../reports/queries'

const reportId = z.string().min(1).max(64)

/** Web-app state for the report screens (ADR-0049): the signed-in user's favourites and saved layouts, and account drill-down. */
export function webReportRoutes(db: Db) {
  return new Hono<AuthEnv>()
    .get('/favourites', async c =>
      c.json((await db.execute(sql`SELECT report_id FROM report_favourites WHERE user_id = ${c.get('userId')} ORDER BY report_id`)).map(r => r.report_id as string)))
    // Toggles the star and answers the new state.
    .post('/favourites/:id', async c => {
      const id = reportId.parse(c.req.param('id')), user = c.get('userId')
      const gone = await db.execute(sql`DELETE FROM report_favourites WHERE user_id = ${user} AND report_id = ${id} RETURNING 1`)
      if (!gone.length) await db.execute(sql`INSERT INTO report_favourites (user_id, report_id) VALUES (${user}, ${id})`)
      return c.json({ id, starred: !gone.length })
    })
    .get('/layouts/:id', async c => {
      const [r] = await db.execute(sql`SELECT layout FROM report_layouts WHERE user_id = ${c.get('userId')} AND report_id = ${reportId.parse(c.req.param('id'))}`)
      return c.json({ layout: (r?.layout as Record<string, unknown> | undefined) ?? null })
    })
    // The layout's shape belongs to the web app; the API stores it as given (bodyLimit caps its size).
    .put('/layouts/:id', async c => {
      const id = reportId.parse(c.req.param('id')), layout = z.record(z.string(), z.unknown()).parse(await c.req.json())
      await db.execute(sql`INSERT INTO report_layouts (user_id, report_id, layout) VALUES (${c.get('userId')}, ${id}, ${JSON.stringify(layout)}::jsonb)
        ON CONFLICT (user_id, report_id) DO UPDATE SET layout = EXCLUDED.layout, updated_at = now()`)
      return c.json({ layout })
    })
    // Journal lines posted to the account or its direct sub-accounts in the period; amounts in cents.
    .get('/drill', async c => {
      const q = trialBalanceQuery.extend({ account: z.string().min(1) }).parse(c.req.query())
      const codes = new Set([q.account, ...(await db.execute(sql`SELECT no FROM accounts WHERE parent_no = ${q.account}`)).map(r => r.no as string)])
      return c.json((await loadJournals(db, q.from, q.to)).flatMap(j => j.lines.filter(l => codes.has(l.account)).map(l => ({
        no: j.number, date: j.date, source: typeLabel(j), desc: l.memo || j.description, debit: l.debit, credit: l.credit }))))
    })
}
