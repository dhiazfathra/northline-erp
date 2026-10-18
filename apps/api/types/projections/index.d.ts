import type { Db, Tx } from '../db';
import { type StoredEvent } from '../es/store';
export interface Projection {
    name: string;
    /** Read-model tables this projection owns; truncated on rebuild. */
    tables: string[];
    apply(tx: Tx, e: StoredEvent): Promise<void>;
}
/** journals + journal_lines + account_daily_balances + period_summaries. */
export declare const ledgerProjection: Projection;
export declare const projections: Projection[];
/**
 * Applies new events to one projection, a batch per transaction, checkpoint advanced in the same transaction
 * so a crash never double-applies. Returns the number of events applied.
 */
export declare function catchUp(db: Db, p: Projection, batch?: number): Promise<number>;
/** Drops a projection's read models and replays every event from position 0. */
export declare function rebuild(db: Db, p: Projection): Promise<number>;
/** Read-your-writes: waits until every projection has reached `position`. */
export declare function waitFor(db: Db, position: number, timeoutMs?: number): Promise<void>;
