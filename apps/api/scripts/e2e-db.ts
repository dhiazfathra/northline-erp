// The local database `bun loop evals` runs e2e against (ADR-0050). `reset` recreates it empty; `balance` checks
// debits = credits per month. Refuses any host but localhost, so a loop run can never touch a Neon branch.
import postgres from 'postgres'

const base = process.env.E2E_PG ?? 'postgres://postgres:northline@localhost:55432'
const name = process.env.E2E_DB ?? 'northline_e2e'
const host = new URL(base).hostname
if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) {
  console.error(`refusing non-local database host ${host}`)
  process.exit(3)
}
if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`bad database name ${name}`)

/** Waits up to 30 s for a Postgres that is still starting (a Docker VM resuming), then gives up with one line. */
async function connect(db: string) {
  for (let i = 0; ; i++) {
    const sql = postgres(`${base}/${db}`, { onnotice: () => {}, max: 1 })
    try {
      await sql`SELECT 1`
      return sql
    } catch (e) {
      await sql.end()
      const code = (e as { code?: string }).code
      if (i < 30 && (code === 'ECONNREFUSED' || code === '57P03')) await Bun.sleep(1000)
      else throw e
    }
  }
}

async function main(cmd?: string) {
  if (cmd === 'reset') {
    const sql = await connect('postgres')
    await sql.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
    await sql.unsafe(`CREATE DATABASE ${name}`)
    await sql.end()
    return console.log(`fresh ${name} on ${host}`)
  }
  if (cmd === 'balance') {
    const sql = await connect(name)
    const off = await sql`SELECT to_char(date, 'YYYY-MM') AS month, sum(debit) AS debit, sum(credit) AS credit
      FROM journal_lines GROUP BY 1 HAVING sum(debit) <> sum(credit) ORDER BY 1`
    const [{ lines }] = await sql`SELECT count(*)::int AS lines FROM journal_lines`
    await sql.end()
    for (const r of off) console.log(`${r.month}: debit ${r.debit} ≠ credit ${r.credit}`)
    console.log(off.length ? `${off.length} unbalanced months` : `balanced: ${lines} journal lines`)
    process.exit(off.length ? 1 : 0)
  }
  console.error('usage: bun apps/api/scripts/e2e-db.ts reset|balance')
  process.exit(2)
}

// One line instead of a stack trace: the loop prints only the last line of this script's output.
main(process.argv[2]).catch((e: { code?: string; message?: string }) => {
  console.error(e.code === 'ECONNREFUSED' || e.code === '57P03' ? `Postgres at ${host}:${new URL(base).port} is not up: start it with \`bun run dev:db\`` : `error: ${e.message}`)
  process.exit(1)
})
