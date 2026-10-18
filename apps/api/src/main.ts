import { PgBoss } from 'pg-boss'
import { connect, migrate } from './db'
import { createApp } from './app'
import { createUser } from './auth'
import { catchUp, projections, rebuild } from './projections'
import { relayOutbox } from './es/relay'

// northline-api --role=web|worker|all   |   northline-api rebuild <projection>
const arg = (k: string) => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1]
const role = arg('role') ?? 'all'
const { client, db } = connect()
await migrate(client)

if (process.argv[2] === 'create-user') {
  const [email, password] = [process.argv[3], process.env.NL_PASSWORD]
  if (!email || !password) throw new Error('usage: NL_PASSWORD=… northline-api create-user <email>')
  await createUser(db, email, password)
  console.log(`created ${email}`)
  await client.end()
  process.exit(0)
}

if (process.argv[2] === 'rebuild') {
  const p = projections.find(p => p.name === process.argv[3])
  if (!p) throw new Error(`Unknown projection; one of ${projections.map(p => p.name).join(', ')}`)
  console.log(`rebuilt ${p.name}: ${await rebuild(db, p)} events`)
  await client.end()
  process.exit(0)
}

let stopping = false
const stops: Array<() => Promise<void> | void> = []

if (role === 'web' || role === 'all') {
  const app = createApp(db)
  const server = Bun.serve({ port: Number(process.env.PORT ?? 3000), fetch: app.fetch })
  stops.push(() => server.stop())
  console.log(`web on :${server.port}`)
}

if (role === 'worker' || role === 'all') {
  const boss = new PgBoss(process.env.DATABASE_URL!)
  await boss.start()
  const loop = (async () => {
    while (!stopping) {
      let n = 0
      for (const p of projections) n += await catchUp(db, p)
      n += await relayOutbox(db, boss)
      if (!n) await Bun.sleep(250)
    }
  })()
  stops.push(async () => { await loop; await boss.stop({ graceful: true }) })
  console.log('worker running')
}

const shutdown = async (sig: string) => {
  if (stopping) return
  stopping = true
  console.log(`${sig}: draining`)
  for (const s of stops) await s()
  await client.end({ timeout: 5 })
  process.exit(0)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
