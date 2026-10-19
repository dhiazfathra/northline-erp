// Kontraktor Demo seed (ADR-0035): docs/reports/fixtures/contractor/projects-k.json only. Costing AVERAGE.
import { sql } from 'drizzle-orm'
import fx from '../../../../docs/reports/fixtures/contractor/projects-k.json'
import type { Db } from '../../src/db'
import { handle } from '../../src/ledger/handler'

const RE = '300002'
const cents = (s: string) => Math.round(Number(s) * 100)
export default async function seed(db: Db, sync: () => Promise<void>) {
  const depth = (no: string | null): number => (no ? 1 + depth(fx.accounts.find(a => a.no === no)!.parentNo) : 0)
  const open = new Set((await db.execute(sql`SELECT no FROM accounts`)).map(r => r.no as string))
  for (const a of [...fx.accounts].sort((x, y) => depth(x.parentNo) - depth(y.parentNo)))
    if (!open.has(a.no)) await handle(db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any, parentNo: a.parentNo ?? undefined })
  await sync()
  await db.execute(sql`INSERT INTO ledger_settings (retained_earnings_account, fiscal_year_start_month, costing_method)
    SELECT ${RE}, 1, 'AVERAGE' WHERE NOT EXISTS (SELECT 1 FROM ledger_settings)`)
  // ADR-0037: set on every run so an older branch gains the preferences
  await db.execute(sql`UPDATE ledger_settings SET aging_basis = 'INVOICE_DATE', report_style = 'STANDARD'`)
  for (const p of fx.projects) await db.execute(sql`INSERT INTO projects (name, no, description) VALUES (${p.name}, ${p.no}, ${p.description}) ON CONFLICT DO NOTHING`)
  for (const j of fx.journals)
    await handle(db, { type: 'PostJournal', idempotencyKey: `nl-k-${j.ref}`, journalId: crypto.randomUUID(), date: j.date, description: j.description,
      lines: j.lines.map(l => ({ ...l, side: l.side as 'DEBIT' | 'CREDIT' })) })
  await sync()
  for (const b of fx.budgets) {
    const ins = (await db.execute(sql`INSERT INTO budgets (year, month, project, notes) VALUES (${b.year}, ${b.month}, ${b.project}, ${b.notes}) ON CONFLICT DO NOTHING RETURNING id`)) as any
    if (!ins[0]) continue // budget exists: its lines are already there
    for (const l of b.lines) await db.execute(sql`INSERT INTO budget_lines (budget_id, account_no, amount) VALUES (${ins[0].id}, ${l.account}, ${cents(l.amount)})`)
  }
}
