import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { ENTITY, type Entity } from '../activity/log'
import { fmtDate, fmtHeaderDate } from './general-ledger'

export type ActivityRow = {
  id: number; loggedAt: string; action: 'CREATE' | 'UPDATE' | 'DELETE'; entity: Entity; reference: string; docDate: string | null
  user: string; email: string; ip: string
}
const ACTION = { CREATE: 'Buat', UPDATE: 'Ubah', DELETE: 'Hapus' } as const
/** Calendar day of a timestamp in Asia/Jakarta (UTC+7, no DST): the report's Tanggal and its date filter. */
export const jakartaDay = (ts: string) => new Date(Date.parse(ts) + 7 * 3_600_000).toISOString().slice(0, 10)

/**
 * Daftar Log Aktifitas (AuditListReport), docs/reports/AuditListReport.md: rows whose log day falls in [from, to],
 * newest first (log time to the millisecond, then id). Tgl Transaksi is blank for master data.
 */
export function auditList(rows: ActivityRow[], from: string, to: string): string[][] {
  const inRange = rows.filter(r => { const d = jakartaDay(r.loggedAt); return d >= from && d <= to })
  inRange.sort((a, b) => Date.parse(b.loggedAt) - Date.parse(a.loggedAt) || b.id - a.id)
  return [
    ['Daftar Log Aktifitas'],
    [`Dari ${fmtHeaderDate(from)} s/d ${fmtHeaderDate(to)}`],
    ['No/Nama Referensi', 'Tgl Transaksi', 'Tipe Tindakan', 'Tipe Transaksi', 'Tanggal', 'Pengguna', 'Email', 'Alamat IP'],
    ...inRange.map(r => [r.reference, r.docDate ? fmtDate(r.docDate) : '', ACTION[r.action], ENTITY[r.entity], fmtDate(jakartaDay(r.loggedAt)), r.user, r.email, r.ip]),
  ]
}

/** Activity rows (with their author) logged on Jakarta days [from, to], for auditList. */
export async function loadActivity(db: Db, from: string, to: string): Promise<ActivityRow[]> {
  const rows = await db.execute(sql`SELECT a.id, a.logged_at, a.action, a.entity, a.reference, to_char(a.doc_date, 'YYYY-MM-DD') AS doc_date,
      COALESCE(u.name, u.email, '') AS user_name, COALESCE(u.email, '') AS email, COALESCE(a.client_ip, '') AS ip
    FROM activity_log a LEFT JOIN users u ON u.id = a.user_id
    WHERE (a.logged_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date`)
  return rows.map(r => ({ id: Number(r.id), loggedAt: new Date(r.logged_at as string).toISOString(), action: r.action as ActivityRow['action'], entity: r.entity as Entity,
    reference: r.reference as string, docDate: (r.doc_date as string | null) ?? null, user: r.user_name as string, email: r.email as string, ip: r.ip as string }))
}
