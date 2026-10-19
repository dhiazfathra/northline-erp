import { sql } from 'drizzle-orm'
import fixture from '../../../docs/reports/fixtures/trial-balance.json'
import { createUser } from '../src/auth'
import { connect, migrate, type Db } from '../src/db'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection } from '../src/projections'

export const RE = '300002' // the sandbox's retained-earnings account
const url = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:northline@localhost:55432/northline'

/** A fresh schema holding exactly the Accurate fixture: accounts via OpenAccount, journals J1..Jn via PostJournal. */
export async function fixtureDb(name: string) {
  const schema = `${name}_${process.pid}`
  const { client, db } = connect(`${url}?options=-c%20search_path%3D${schema}`)
  await client.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema}`)
  await migrate(client)
  for (const a of [...fixture.accounts, { no: RE, name: 'Laba Ditahan', type: 'EQUITY' }])
    await handle(db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(db, ledgerProjection)
  await db.execute(sql`INSERT INTO ledger_settings (retained_earnings_account, fiscal_year_start_month) VALUES (${RE}, ${fixture.fiscalYearStartMonth})`)
  for (const j of fixture.journals)
    await handle(db, { type: 'PostJournal', idempotencyKey: `fixture-${j.ref}`, journalId: crypto.randomUUID(), date: j.date, description: j.description,
      lines: j.lines.map(l => ({ ...l, side: l.side as 'DEBIT' | 'CREDIT' })) })
  await catchUp(db, ledgerProjection)
  const close = async () => { await client.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await client.end() }
  return { db, client, close }
}

/** A user with full access, for tests about anything but access itself (new users default to no privileges, ADR-0040). */
export const createFullUser = (db: Db, email: string, password: string) => createUser(db, email, password, true)
