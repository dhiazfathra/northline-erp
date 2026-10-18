import { sql } from 'drizzle-orm'
import { Hono, type MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { signInSchema } from '@northline/schemas/auth'
import type { Db } from './db'

const COOKIE = 'nl_session'
const TTL_DAYS = 7
const hash = (id: string) => new Bun.CryptoHasher('sha256').update(id).digest('hex')

export async function createUser(db: Db, email: string, password: string) {
  await db.execute(sql`INSERT INTO users (email, password_hash) VALUES (${email.toLowerCase()}, ${await Bun.password.hash(password)})`)
}

export type AuthEnv = { Variables: { userId: number } }

export function authRoutes(db: Db) {
  return new Hono<AuthEnv>()
    .post('/login', async c => {
      const { email, password } = signInSchema.parse(await c.req.json())
      const [u] = await db.execute(sql`SELECT id, password_hash FROM users WHERE email = ${email.toLowerCase()}`)
      // verify against a dummy hash when the user is missing so timing does not reveal accounts
      const ok = await Bun.password.verify(password, (u?.password_hash as string) ?? '$argon2id$v=19$m=65536,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA').catch(() => false)
      if (!u || !ok) return c.json({ error: 'Email atau kata sandi salah' }, 401)
      const id = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
      await db.execute(sql`INSERT INTO sessions (id_hash, user_id, expires_at) VALUES (${hash(id)}, ${u.id}, now() + ${`${TTL_DAYS} days`}::interval)`)
      setCookie(c, COOKIE, id, { httpOnly: true, sameSite: 'Strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: TTL_DAYS * 86400 })
      return c.json({ ok: true })
    })
    .post('/logout', async c => {
      const id = getCookie(c, COOKIE)
      if (id) await db.execute(sql`DELETE FROM sessions WHERE id_hash = ${hash(id)}`)
      deleteCookie(c, COOKIE, { path: '/' })
      return c.json({ ok: true })
    })
}

export const requireSession = (db: Db): MiddlewareHandler<AuthEnv> => async (c, next) => {
  const id = getCookie(c, COOKIE)
  const [s] = id ? await db.execute(sql`SELECT user_id FROM sessions WHERE id_hash = ${hash(id)} AND expires_at > now()`) : []
  if (!s) return c.json({ error: 'unauthenticated' }, 401)
  c.set('userId', Number(s.user_id))
  await next()
}
