import { type LedgerCommandInput } from '@northline/schemas/ledger-es';
import type { Db, Tx } from '../db';
export interface CommandResult {
    globalPosition: number;
    streams: string[];
}
/**
 * Validates and executes one ledger command in a single transaction: decide → append (+outbox) → store result
 * under the idempotency key. Replaying the same key returns the first result without new events.
 */
export declare function handle(db: Db, input: LedgerCommandInput, metadata?: Record<string, unknown>): Promise<CommandResult>;
/** Same as handle() inside the caller's transaction, so a document and its journal commit together. */
export declare function handleTx(tx: Tx, input: LedgerCommandInput, metadata?: Record<string, unknown>): Promise<CommandResult>;
