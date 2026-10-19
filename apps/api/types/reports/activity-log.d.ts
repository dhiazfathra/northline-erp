import type { Db } from '../db';
import { type Entity } from '../activity/log';
export type ActivityRow = {
    id: number;
    loggedAt: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    entity: Entity;
    reference: string;
    docDate: string | null;
    user: string;
    email: string;
    ip: string;
};
/** Calendar day of a timestamp in Asia/Jakarta (UTC+7, no DST): the report's Tanggal and its date filter. */
export declare const jakartaDay: (ts: string) => string;
/**
 * Daftar Log Aktifitas (AuditListReport), docs/reports/AuditListReport.md: rows whose log day falls in [from, to],
 * newest first (log time to the millisecond, then id). Tgl Transaksi is blank for master data.
 */
export declare function auditList(rows: ActivityRow[], from: string, to: string): string[][];
/** Activity rows (with their author) logged on Jakarta days [from, to], for auditList. */
export declare function loadActivity(db: Db, from: string, to: string): Promise<ActivityRow[]>;
