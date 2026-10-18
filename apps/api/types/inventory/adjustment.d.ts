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
export {};
