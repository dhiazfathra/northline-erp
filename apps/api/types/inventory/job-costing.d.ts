import { z } from 'zod';
import type { Db } from '../db';
declare const jobInput: z.ZodObject<{
    idempotencyKey: z.ZodString;
    number: z.ZodOptional<z.ZodString>;
    date: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    wipAccount: z.ZodString;
    customer: z.ZodOptional<z.ZodString>;
    materials: z.ZodDefault<z.ZodArray<z.ZodObject<{
        item: z.ZodString;
        qty: z.ZodNumber;
    }, z.core.$strip>>>;
    expenses: z.ZodDefault<z.ZodArray<z.ZodObject<{
        account: z.ZodString;
        name: z.ZodString;
        amount: z.ZodNumber;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare function createJobOrder(db: Db, raw: z.input<typeof jobInput>): Promise<{
    number: string;
}>;
declare const rollInput: z.ZodObject<{
    idempotencyKey: z.ZodString;
    number: z.ZodOptional<z.ZodString>;
    job: z.ZodString;
    date: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    lines: z.ZodDefault<z.ZodArray<z.ZodObject<{
        item: z.ZodString;
        qty: z.ZodNumber;
        portion: z.ZodNumber;
    }, z.core.$strip>>>;
    accounts: z.ZodDefault<z.ZodArray<z.ZodObject<{
        account: z.ZodString;
        name: z.ZodString;
        portion: z.ZodNumber;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare function createRollOver(db: Db, raw: z.input<typeof rollInput>): Promise<{
    number: string;
}>;
declare const adjInput: z.ZodObject<{
    idempotencyKey: z.ZodString;
    number: z.ZodOptional<z.ZodString>;
    job: z.ZodString;
    type: z.ZodEnum<{
        ITEM_PICK: "ITEM_PICK";
        ITEM_RETURN: "ITEM_RETURN";
    }>;
    date: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    lines: z.ZodArray<z.ZodObject<{
        item: z.ZodString;
        qty: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
/** Penambahan Bahan Baku (MA): Ambil Barang issues more material into an open job at FIFO cost (Dr WIP / Cr inventory);
 * Retur Barang takes material back at the job's average issued unit cost of that item (Dr inventory / Cr WIP). */
export declare function createMaterialAdjustment(db: Db, raw: z.input<typeof adjInput>): Promise<{
    number: string;
}>;
export {};
