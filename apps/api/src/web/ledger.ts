import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { isoDate } from '@northline/schemas/ledger-es'
import type { AuthEnv } from '../auth'
import type { Db } from '../db'
import { reconcileBankEntry } from '../cash-bank/reconcile'
import { DomainError } from '../ledger/deciders'
import { waitFor } from '../projections'
import type { AccountType } from '../reports/trial-balance'

// Buku Besar screen reads (ADR-0049). Amounts in cents like the ledger reports; writes go through POST /api/ledger/commands,
// POST /api/period-ends and the reconcile route below.

const CREDIT_NORMAL = new Set<AccountType>(['ACCOUNT_PAYABLE', 'OTHER_CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'EQUITY', 'REVENUE', 'OTHER_INCOME', 'ACCUMULATED_DEPRECIATION'])

/** Account numbers in each account's subtree (itself included). */
async function subtrees(db: Db) {
  const rows = (await db.execute(sql`SELECT no, name, type, parent_no, suspended FROM accounts ORDER BY no`))
    .map(r => ({ no: r.no as string, name: r.name as string, type: r.type as AccountType, parentNo: (r.parent_no as string | null) ?? null, suspended: !!r.suspended }))
  const under = (no: string): string[] => [no, ...rows.filter(r => r.parentNo === no).flatMap(r => under(r.no))]
  return { rows, under }
}

const lineRows = (db: Db, nos: string[], from = '0001-01-01', to = '9999-12-31') => db.execute(sql`
  SELECT j.number, j.source_type, to_char(j.date,'YYYY-MM-DD') AS date, j.description, l.account_no, l.debit, l.credit
  FROM journals j JOIN journal_lines l USING (journal_id)
  WHERE l.account_no IN ${nos} AND j.date BETWEEN ${from} AND ${to} ORDER BY j.date, j.number, l.line_no`)

export function ledgerWebRoutes(db: Db) {
  return new Hono<AuthEnv>()
    // after=<globalPosition> waits for the projection, so a list fetched right after a command sees it
    .get('/accounts', async c => {
      const after = z.coerce.number().int().min(0).parse(c.req.query('after') ?? 0)
      if (after) await waitFor(db, after)
      const { rows, under } = await subtrees(db)
      const net = new Map((await db.execute(sql`SELECT account_no, SUM(debit) - SUM(credit) AS net FROM account_daily_balances GROUP BY account_no`))
        .map(r => [r.account_no as string, Number(r.net)]))
      const det = new Map((await db.execute(sql`SELECT * FROM account_details`)).map(d => [d.account_no as string, {
        note: d.note as string, bank: d.bank as string, accNo: d.acc_no as string, accName: d.acc_name as string, allUsers: !!d.all_users, users: d.users as string[] }]))
      return c.json(rows.map(a => {
        const raw = under(a.no).reduce((s, n) => s + (net.get(n) ?? 0), 0)
        return { ...a, balance: CREDIT_NORMAL.has(a.type) ? -raw : raw, ...(det.get(a.no) ?? { note: '', bank: '', accNo: '', accName: '', allUsers: true, users: [] as string[] }) }
      }))
    })
    .put('/accounts/:no/details', async c => {
      const d = z.object({ note: z.string().max(1000), bank: z.string().max(100), accNo: z.string().max(100), accName: z.string().max(200), allUsers: z.boolean(), users: z.array(z.string()) })
        .parse(await c.req.json())
      await db.execute(sql`INSERT INTO account_details (account_no, note, bank, acc_no, acc_name, all_users, users)
        VALUES (${c.req.param('no')}, ${d.note}, ${d.bank}, ${d.accNo}, ${d.accName}, ${d.allUsers}, ${JSON.stringify(d.users)}::jsonb)
        ON CONFLICT (account_no) DO UPDATE SET note = EXCLUDED.note, bank = EXCLUDED.bank, acc_no = EXCLUDED.acc_no, acc_name = EXCLUDED.acc_name,
          all_users = EXCLUDED.all_users, users = EXCLUDED.users`)
      return c.json(d)
    })
    .get('/accounts/:no/lines', async c => {
      const { under } = await subtrees(db)
      const rows = await lineRows(db, under(c.req.param('no')))
      return c.json(rows.map(r => ({ number: r.number as string, date: r.date as string, description: r.description as string, debit: Number(r.debit), credit: Number(r.credit) })))
    })
    // Rekonsiliasi Bank: every journal line on a Kas & Bank leaf in the range, matched when reconciled
    .get('/banks', async c => {
      const { from, to } = z.object({ from: isoDate, to: isoDate }).parse(c.req.query())
      const { rows, under } = await subtrees(db)
      const banks = rows.filter(a => a.type === 'CASH_BANK' && under(a.no).length === 1)
      if (!banks.length) return c.json([])
      const nos = banks.map(b => b.no)
      const lines = await lineRows(db, nos, from, to)
      const done = new Set((await db.execute(sql`SELECT bank_no, doc_number FROM bank_reconciliations`)).map(r => `${r.bank_no}|${r.doc_number}`))
      const bal = new Map((await db.execute(sql`SELECT account_no, SUM(debit) - SUM(credit) AS net FROM account_daily_balances WHERE account_no IN ${nos} AND date <= ${to} GROUP BY account_no`))
        .map(r => [r.account_no as string, Number(r.net)]))
      return c.json(banks.map(b => ({
        no: b.no, name: `${b.no} ${b.name}`, balance: bal.get(b.no) ?? 0,
        entries: lines.filter(l => l.account_no === b.no).map((l, i) => ({
          id: `${b.no}|${l.number}|${i}`, date: l.date as string, side: Number(l.debit) ? 'debit' as const : 'credit' as const, amount: Number(l.debit) || Number(l.credit),
          type: l.source_type as string, no: l.number as string, party: l.description as string, matched: done.has(`${b.no}|${l.number}`),
        })),
      })))
    })
    .post('/banks/reconcile', async c => {
      const r = z.object({ bank: z.string().min(1), document: z.string().min(1), statementDate: isoDate }).parse(await c.req.json())
      await reconcileBankEntry(db, { ...r, statementDescription: '', by: String(c.get('userId')) })
      return c.json({ ok: true }, 201)
    })
    .get('/period-ends', async c => c.json((await db.execute(sql`SELECT period, number, to_char(date,'YYYY-MM-DD') AS date FROM period_ends ORDER BY period DESC`))
      .map(r => ({ period: r.period as string, number: r.number as string, date: r.date as string }))))
    // Preferensi > Fitur: only the on/off state per feature id is stored; names and rules live in the web app
    .get('/features', async c => {
      const [r] = await db.execute(sql`SELECT features FROM ledger_settings`)
      return c.json((r?.features ?? {}) as Record<string, boolean>)
    })
    .put('/features', async c => {
      const f = z.record(z.string().min(1).max(40), z.boolean()).parse(await c.req.json())
      const r = await db.execute(sql`UPDATE ledger_settings SET features = ${JSON.stringify(f)}::jsonb RETURNING 1`)
      if (!r.length) throw new DomainError('ledger_settings not configured')
      return c.json(f)
    })
    // Preferensi > Akun: label → account no; shortcut: no screen edits it yet, set it with SQL until one does
    .get('/default-accounts', async c => {
      const [r] = await db.execute(sql`SELECT default_accounts FROM ledger_settings`)
      const map = (r?.default_accounts ?? {}) as Record<string, string>
      const names = new Map((await db.execute(sql`SELECT no, name FROM accounts`)).map(a => [a.no as string, a.name as string]))
      return c.json(Object.entries(map).map(([label, no]) => ({ label, value: names.has(no) ? `${no} ${names.get(no)}` : no })))
    })
}
export type LedgerWebType = ReturnType<typeof ledgerWebRoutes>
