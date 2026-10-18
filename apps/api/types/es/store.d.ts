import type { Db, Tx } from '../db';
export interface NewEvent {
    type: string;
    data: unknown;
    metadata?: Record<string, unknown>;
}
export interface StoredEvent {
    globalPosition: number;
    streamId: string;
    streamVersion: number;
    type: string;
    version: number;
    data: any;
    metadata: Record<string, unknown>;
    createdAt: Date;
}
export declare class ConcurrencyError extends Error {
    constructor(streamId: string, expected: number);
}
/** Event schema evolution: (type, fromVersion) → payload at fromVersion+1. Applied on read. */
type Upcaster = (data: any) => any;
export declare const CURRENT_VERSION: Record<string, number>;
export declare function registerUpcaster(type: string, fromVersion: number, fn: Upcaster): void;
export declare function readStream(db: Db | Tx, streamId: string, afterVersion?: number): Promise<StoredEvent[]>;
export declare function readAll(db: Db | Tx, afterPosition: number, limit?: number): Promise<StoredEvent[]>;
/**
 * Appends with optimistic concurrency: `expectedVersion` is the stream's current version (0 = new stream).
 * The unique (stream_id, stream_version) index turns a lost race into ConcurrencyError.
 */
export declare function append(tx: Tx, streamId: string, expectedVersion: number, events: NewEvent[]): Promise<StoredEvent[]>;
export interface Decider<S, C, E extends {
    type: string;
    data: unknown;
}> {
    initial: S;
    evolve(state: S, event: E): S;
    decide(state: S, command: C): E[];
}
/** Loads an aggregate from its latest snapshot plus newer events. */
export declare function load<S, E extends {
    type: string;
    data: unknown;
}>(db: Db | Tx, streamId: string, decider: Pick<Decider<S, any, E>, 'initial' | 'evolve'>): Promise<{
    state: S;
    version: number;
}>;
export declare function maybeSnapshot(tx: Tx, streamId: string, version: number, state: unknown): Promise<void>;
export {};
