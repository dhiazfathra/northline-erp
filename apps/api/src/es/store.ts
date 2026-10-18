import { sql } from 'drizzle-orm'
import type { Db, Tx } from '../db'

export interface NewEvent { type: string; data: unknown; metadata?: Record<string, unknown> }
export interface StoredEvent {
  globalPosition: number
  streamId: string
  streamVersion: number
  type: string
  version: number
  data: any
  metadata: Record<string, unknown>
  createdAt: Date
}

export class ConcurrencyError extends Error {
  constructor(streamId: string, expected: number) {
    super(`Stream ${streamId} is not at version ${expected}`)
  }
}

/** Event schema evolution: (type, fromVersion) → payload at fromVersion+1. Applied on read. */
type Upcaster = (data: any) => any
const upcasters = new Map<string, Upcaster>()
export const CURRENT_VERSION: Record<string, number> = {}
export function registerUpcaster(type: string, fromVersion: number, fn: Upcaster) {
  upcasters.set(`${type}@${fromVersion}`, fn)
  CURRENT_VERSION[type] = Math.max(CURRENT_VERSION[type] ?? 1, fromVersion + 1)
}
function upcast(e: StoredEvent): StoredEvent {
  let { data, version } = e
  for (let fn; (fn = upcasters.get(`${e.type}@${version}`)); version++) data = fn(data)
  return { ...e, data, version }
}

const toStored = (r: any): StoredEvent => upcast({
  globalPosition: Number(r.global_position),
  streamId: r.stream_id,
  streamVersion: r.stream_version,
  type: r.event_type,
  version: r.event_version,
  data: r.payload,
  metadata: r.metadata,
  createdAt: r.created_at,
})

export async function readStream(db: Db | Tx, streamId: string, afterVersion = 0): Promise<StoredEvent[]> {
  const rows = await db.execute(sql`SELECT * FROM events WHERE stream_id = ${streamId} AND stream_version > ${afterVersion} ORDER BY stream_version`)
  return rows.map(toStored)
}

export async function readAll(db: Db | Tx, afterPosition: number, limit = 500): Promise<StoredEvent[]> {
  const rows = await db.execute(sql`SELECT * FROM events WHERE global_position > ${afterPosition} ORDER BY global_position LIMIT ${limit}`)
  return rows.map(toStored)
}

/**
 * Appends with optimistic concurrency: `expectedVersion` is the stream's current version (0 = new stream).
 * The unique (stream_id, stream_version) index turns a lost race into ConcurrencyError.
 */
export async function append(tx: Tx, streamId: string, expectedVersion: number, events: NewEvent[]): Promise<StoredEvent[]> {
  const out: StoredEvent[] = []
  let v = expectedVersion
  for (const e of events) {
    v++
    try {
      const [row] = await tx.execute(sql`
        INSERT INTO events (stream_id, stream_version, event_type, event_version, payload, metadata)
        VALUES (${streamId}, ${v}, ${e.type}, ${CURRENT_VERSION[e.type] ?? 1}, ${JSON.stringify(e.data)}::jsonb, ${JSON.stringify(e.metadata ?? {})}::jsonb)
        RETURNING *`)
      const stored = toStored(row)
      await tx.execute(sql`INSERT INTO outbox (global_position, topic, payload) VALUES (${stored.globalPosition}, ${'ledger.' + e.type}, ${JSON.stringify({ ...stored, createdAt: undefined })}::jsonb)`)
      out.push(stored)
    } catch (err: any) {
      if (err?.code === '23505' || err?.cause?.code === '23505') throw new ConcurrencyError(streamId, expectedVersion)
      throw err
    }
  }
  return out
}

export interface Decider<S, C, E extends { type: string; data: unknown }> {
  initial: S
  evolve(state: S, event: E): S
  decide(state: S, command: C): E[]
}

const SNAPSHOT_EVERY = 50

/** Loads an aggregate from its latest snapshot plus newer events. */
export async function load<S, E extends { type: string; data: unknown }>(
  db: Db | Tx, streamId: string, decider: Pick<Decider<S, any, E>, 'initial' | 'evolve'>,
): Promise<{ state: S; version: number }> {
  const [snap] = await db.execute(sql`SELECT stream_version, state FROM snapshots WHERE stream_id = ${streamId}`)
  let state = (snap?.state as S) ?? decider.initial
  let version = (snap?.stream_version as number) ?? 0
  for (const e of await readStream(db, streamId, version)) {
    state = decider.evolve(state, { type: e.type, data: e.data } as E)
    version = e.streamVersion
  }
  return { state, version }
}

export async function maybeSnapshot(tx: Tx, streamId: string, version: number, state: unknown) {
  if (version % SNAPSHOT_EVERY !== 0) return
  await tx.execute(sql`
    INSERT INTO snapshots (stream_id, stream_version, state) VALUES (${streamId}, ${version}, ${JSON.stringify(state)}::jsonb)
    ON CONFLICT (stream_id) DO UPDATE SET stream_version = EXCLUDED.stream_version, state = EXCLUDED.state`)
}
