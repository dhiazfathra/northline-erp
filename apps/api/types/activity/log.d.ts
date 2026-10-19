import type { Tx } from '../db';
/** Who made the change: the session's user and the client IP of the request (ADR-0019). */
export type Actor = {
    userId: number | null;
    ip: string | null;
};
/** Runs `fn` with `actor` as the author of every activity it logs (set per request by the API middleware). */
export declare const withActor: <T>(actor: Actor, fn: () => T) => T;
export declare const currentActor: () => Actor;
/** Accurate's Tipe Transaksi per entity code (the codes `search-audit.do` reports). */
export declare const ENTITY: {
    readonly JV: 'Jurnal Umum';
    readonly SI: 'Faktur Penjualan';
    readonly ACC: 'Akun Perkiraan';
    readonly ANT: 'Penomoran';
    readonly ITM: 'Barang & Jasa';
    readonly CST: 'Pelanggan';
    readonly CTC: 'Kontak';
    readonly PRF: 'Preferensi';
};
export type Entity = keyof typeof ENTITY;
export type Activity = {
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    entity: Entity;
    reference: string;
    docDate?: string | null;
};
/** Appends one Log Aktifitas row inside the caller's transaction, so the row exists exactly when the change commits. */
export declare function logActivity(tx: Tx, a: Activity, actor?: Actor): Promise<void>;
