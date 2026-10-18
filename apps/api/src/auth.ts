import { sql } from 'drizzle-orm'
import { Hono, type MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { signInSchema } from '@northline/schemas/auth'
import type { Db } from './db'

const COOKIE = 'nl_session'
const TTL_DAYS = 7
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')
const hash = async (id: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id)))

// PBKDF2 via Web Crypto so the same hashes verify on Bun and on Workers (no argon2 there; Workers caps iterations at 100k).
const ITER = 100_000
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)))
const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0))
async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iter: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256))
}
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2$${ITER}$${b64(salt)}$${b64(await pbkdf2(password, salt, ITER))}`
}
export async function verifyPassword(password: string, stored: string) {
  // users created before ADR-0017 hold Bun argon2 hashes; those only verify on Bun
  if (stored.startsWith('$argon2')) return (globalThis as any).Bun?.password.verify(password, stored) ?? false
  const [, iter, salt, want] = stored.split('$')
  const got = await pbkdf2(password, unb64(salt!), Number(iter)), exp = unb64(want!)
  let diff = got.length ^ exp.length
  for (let i = 0; i < got.length; i++) diff |= got[i]! ^ (exp[i] ?? 0)
  return diff === 0
}
// verify against a dummy hash when the user is missing so timing does not reveal accounts
const DUMMY = `pbkdf2$${ITER}$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`

export async function createUser(db: Db, email: string, password: string) {
  await db.execute(sql`INSERT INTO users (email, password_hash) VALUES (${email.toLowerCase()}, ${await hashPassword(password)})`)
}

// Failed logins per email; shortcut: in-memory per instance, move to a table if Workers instances multiply.
const FAIL_MAX = 10, FAIL_WINDOW_MS = 15 * 60_000
const failures = new Map<string, { n: number; until: number }>()
const locked = (email: string) => { const f = failures.get(email); return !!f && f.until > Date.now() && f.n >= FAIL_MAX }
const fail = (email: string) => {
  const f = failures.get(email), now = Date.now()
  failures.set(email, f && f.until > now ? { n: f.n + 1, until: f.until } : { n: 1, until: now + FAIL_WINDOW_MS })
}

export type AuthEnv = { Variables: { userId: number } }

export function authRoutes(db: Db) {
  return new Hono<AuthEnv>()
    .post('/login', async c => {
      const { email: raw, password } = signInSchema.parse(await c.req.json()), email = raw.toLowerCase()
      if (locked(email)) return c.json({ error: 'Terlalu banyak percobaan, coba lagi nanti' }, 429)
      const [u] = await db.execute(sql`SELECT id, password_hash FROM users WHERE email = ${email}`)
      const ok = await verifyPassword(password, (u?.password_hash as string) ?? DUMMY).catch(() => false)
      if (!u || !ok) { fail(email); return c.json({ error: 'Email atau kata sandi salah' }, 401) }
      failures.delete(email)
      await db.execute(sql`DELETE FROM sessions WHERE expires_at < now()`)
      const id = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
      await db.execute(sql`INSERT INTO sessions (id_hash, user_id, expires_at) VALUES (${await hash(id)}, ${u.id}, now() + ${`${TTL_DAYS} days`}::interval)`)
      setCookie(c, COOKIE, id, { httpOnly: true, sameSite: 'Strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: TTL_DAYS * 86400 })
      return c.json({ ok: true })
    })
    .post('/logout', async c => {
      const id = getCookie(c, COOKIE)
      if (id) await db.execute(sql`DELETE FROM sessions WHERE id_hash = ${await hash(id)}`)
      deleteCookie(c, COOKIE, { path: '/' })
      return c.json({ ok: true })
    })
}

export const requireSession = (db: Db): MiddlewareHandler<AuthEnv> => async (c, next) => {
  const id = getCookie(c, COOKIE)
  const [s] = id ? await db.execute(sql`SELECT user_id FROM sessions WHERE id_hash = ${await hash(id)} AND expires_at > now()`) : []
  if (!s) return c.json({ error: 'unauthenticated' }, 401)
  c.set('userId', Number(s.user_id))
  await next()
}
