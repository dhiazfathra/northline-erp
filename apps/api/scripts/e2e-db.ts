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

// One line instead of a stack trace: the loop prints only the last line of this script's output.
process.on('unhandledRejection', (e: { code?: string; message?: string }) => {
  console.error(e.code === 'ECONNREFUSED' ? `Postgres at ${host}:${new URL(base).port} is down: start it with \`bun run dev:db\`` : `${e.message}`)
  process.exit(1)
})

const cmd = process.argv[2]
if (cmd === 'reset') {
  const sql = postgres(`${base}/postgres`, { onnotice: () => {} })
  await sql.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
  await sql.unsafe(`CREATE DATABASE ${name}`)
  await sql.end()
  console.log(`fresh ${name} on ${host}`)
} else if (cmd === 'balance') {
  const sql = postgres(`${base}/${name}`, { onnotice: () => {} })
  const off = await sql`SELECT to_char(date, 'YYYY-MM') AS month, sum(debit) AS debit, sum(credit) AS credit
    FROM journal_lines GROUP BY 1 HAVING sum(debit) <> sum(credit) ORDER BY 1`
  const [{ lines }] = await sql`SELECT count(*)::int AS lines FROM journal_lines`
  await sql.end()
  for (const r of off) console.log(`${r.month}: debit ${r.debit} ≠ credit ${r.credit}`)
  console.log(off.length ? `${off.length} unbalanced months` : `balanced: ${lines} journal lines`)
  process.exit(off.length ? 1 : 0)
} else {
  console.error('usage: bun apps/api/scripts/e2e-db.ts reset|balance')
  process.exit(2)
}
