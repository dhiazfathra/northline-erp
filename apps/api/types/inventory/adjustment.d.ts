import { z } from 'zod';
import type { Db } from '../db';
declare const input: z.ZodObject<{
    idempotencyKey: z.ZodString;
    number: z.ZodOptional<z.ZodString>;
    date: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    account: z.ZodString;
    lines: z.ZodArray<z.ZodObject<{
        item: z.ZodString;
        direction: z.ZodEnum<{
            IN: "IN";
            OUT: "OUT";
        }>;
        qty: z.ZodNumber;
        unitCost: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare function createItemAdjustment(db: Db, raw: z.input<typeof input>): Promise<{
    number: string;
}>;
export declare const TRANSIT = "Transit (AOL System)";
/** Pemindahan Barang: Kirim (OUT) moves stock into the transit warehouse, Terima (IN) out of it. No journal, no value.
 *  A receipt names its send (`from`); serial/batch numbers move with their line (ADR-0024). */
export declare function createItemTransfer(db: Db, t: {
    number?: string;
    date: string;
    direction: 'OUT' | 'IN';
    warehouse: string;
    referenceWarehouse: string;
    description?: string;
    from?: string;
    lines: {
        item: string;
        qty: number;
        serials?: {
            no: string;
            qty: number;
        }[];
    }[];
}): Promise<{
    number: string;
}>;
/** Gudang master (Daftar Gudang). */
export declare function upsertWarehouse(db: Db, w: {
    name: string;
    description?: string;
    street?: string;
    city?: string;
    province?: string;
    zipCode?: string;
    country?: string;
}): Promise<void>;
export {};
