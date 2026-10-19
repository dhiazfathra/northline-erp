import { AsyncLocalStorage } from 'node:async_hooks'
import { sql } from 'drizzle-orm'
import type { Tx } from '../db'

/** Who made the change: the session's user and the client IP of the request (ADR-0019). */
export type Actor = { userId: number | null; ip: string | null }

const actors = new AsyncLocalStorage<Actor>()
/** Runs `fn` with `actor` as the author of every activity it logs (set per request by the API middleware). */
export const withActor = <T>(actor: Actor, fn: () => T) => actors.run(actor, fn)
export const currentActor = (): Actor => actors.getStore() ?? { userId: null, ip: null }

/** Accurate's Tipe Transaksi per entity code (the codes `search-audit.do` reports). */
export const ENTITY = {
  JV: 'Jurnal Umum', SI: 'Faktur Penjualan', ACC: 'Akun Perkiraan', ANT: 'Penomoran', ITM: 'Barang & Jasa', CST: 'Pelanggan', CTC: 'Kontak', PRF: 'Preferensi',
} as const
export type Entity = keyof typeof ENTITY
export type Activity = { action: 'CREATE' | 'UPDATE' | 'DELETE'; entity: Entity; reference: string; docDate?: string | null }

/** Appends one Log Aktifitas row inside the caller's transaction, so the row exists exactly when the change commits. */
export async function logActivity(tx: Tx, a: Activity, actor: Actor = currentActor()) {
  await tx.execute(sql`INSERT INTO activity_log (user_id, client_ip, action, entity, reference, doc_date)
    VALUES (${actor.userId}, ${actor.ip}, ${a.action}, ${a.entity}, ${a.reference}, ${a.docDate ?? null})`)
}
