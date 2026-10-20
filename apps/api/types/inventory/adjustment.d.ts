import { z } from 'zod';
import type { Db, Tx } from '../db';
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
export declare function createItemAdjustment(db: Db | Tx, raw: z.input<typeof input>): Promise<{
    number: string;
}>;
export declare function deleteItemAdjustment(db: Db, number: string, idempotencyKey: string): Promise<{
    number: string;
}>;
/** Edited in place under the same number, as Accurate does: taken back and saved again. */
export declare function editItemAdjustment(db: Db, number: string, raw: z.input<typeof input>): Promise<{
    number: string;
}>;
export declare const TRANSIT = "Transit (AOL System)";
/** Pemindahan Barang: Kirim (OUT) moves stock into the transit warehouse, Terima (IN) out of it. No journal, no value.
 *  A receipt names its send (`from`); serial/batch numbers move with their line (ADR-0024). */
declare const transferInput: z.ZodObject<{
    idempotencyKey: z.ZodOptional<z.ZodString>;
    number: z.ZodOptional<z.ZodString>;
    date: z.ZodString;
    direction: z.ZodEnum<{
        IN: "IN";
        OUT: "OUT";
    }>;
    warehouse: z.ZodString;
    referenceWarehouse: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodString>;
    lines: z.ZodArray<z.ZodObject<{
        item: z.ZodString;
        qty: z.ZodNumber;
        serials: z.ZodOptional<z.ZodArray<z.ZodObject<{
            no: z.ZodString;
            qty: z.ZodNumber;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare function createItemTransfer(db: Db | Tx, raw: z.input<typeof transferInput>): Promise<{
    number: string;
}>;
export declare function deleteItemTransfer(db: Db, number: string, idempotencyKey: string): Promise<{
    number: string;
}>;
/** Edited in place under the same number, as Accurate does: taken back and saved again. */
export declare function editItemTransfer(db: Db, number: string, raw: z.input<typeof transferInput> & {
    idempotencyKey: string;
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
