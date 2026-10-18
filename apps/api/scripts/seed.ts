// Migrates and seeds a database (Neon prod or local): trial-balance fixture ledger + sales-t2 customers/items/invoices
// + one login. Idempotent: commands carry idempotency keys, master rows upsert, the user is inserted once.
// DATABASE_URL=… NL_EMAIL=… NL_PASSWORD=… bun scripts/seed.ts
import { sql } from 'drizzle-orm'
import tb from '../../../docs/reports/fixtures/trial-balance.json'
import t2 from '../../../docs/reports/fixtures/sales-t2.json'
import { createUser } from '../src/auth'
import { connect, migrate } from '../src/db'
import { handle } from '../src/ledger/handler'
import { catchUp, projections } from '../src/projections'
import { createSalesInvoice, createSalesReceipt, upsertCustomer, upsertItem } from '../src/sales/service'

const RE = '300002'
const { client, db } = connect()
const sync = async () => { for (const p of projections) await catchUp(db, p) }
await migrate(client)

const accounts = [...tb.accounts, { no: RE, name: 'Laba Ditahan', type: 'EQUITY' }, ...t2.accounts.filter(a => !a.no.startsWith('NL-T1'))]
// skip accounts a dev DB already opened under another idempotency key
const open = new Set((await db.execute(sql`SELECT no FROM accounts`)).map(r => r.no as string))
for (const a of new Map(accounts.map(a => [a.no, a])).values())
  if (!open.has(a.no)) await handle(db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
await sync()
await db.execute(sql`INSERT INTO ledger_settings (retained_earnings_account, fiscal_year_start_month)
  SELECT ${RE}, ${tb.fiscalYearStartMonth} WHERE NOT EXISTS (SELECT 1 FROM ledger_settings)`)
for (const j of tb.journals)
  await handle(db, { type: 'PostJournal', idempotencyKey: `seed-${j.ref}`, journalId: crypto.randomUUID(), date: j.date, description: j.description,
    lines: j.lines.map(l => ({ ...l, side: l.side as 'DEBIT' | 'CREDIT' })) })

for (const c of t2.customers) await upsertCustomer(db, c)
for (const i of t2.items) await upsertItem(db, i as any)
for (const d of t2.documents as any[]) {
  if (d.kind === 'SalesInvoice') await createSalesInvoice(db, { idempotencyKey: `t2-${d.ref}`, number: d.number, customer: d.customer, date: d.date, dueDate: d.dueDate, description: d.description, lines: d.lines })
  else await createSalesReceipt(db, { idempotencyKey: `t2-${d.ref}`, number: d.number, customer: d.customer, bank: d.bank, date: d.date, description: d.description, payments: d.payments })
}
await sync()

const [email, password] = [process.env.NL_EMAIL, process.env.NL_PASSWORD]
if (email && password) {
  const [u] = await db.execute(sql`SELECT 1 FROM users WHERE email = ${email.toLowerCase()}`)
  if (!u) await createUser(db, email, password)
}
const [n] = await db.execute(sql`SELECT (SELECT count(*) FROM events) AS events, (SELECT count(*) FROM journals) AS journals, (SELECT count(*) FROM customers) AS customers`)
console.log('seeded', n)
await client.end()
