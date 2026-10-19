import { z } from 'zod';
import type { Db } from '../db';
declare const orderInput: z.ZodObject<{
    idempotencyKey: z.ZodString;
    number: z.ZodOptional<z.ZodString>;
    date: z.ZodString;
    dueDate: z.ZodString;
    bank: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    paymentMethod: z.ZodDefault<z.ZodEnum<{
        BANK_TRANSFER: "BANK_TRANSFER";
        CHEQUE: "CHEQUE";
        VIRTUAL_ACCOUNT: "VIRTUAL_ACCOUNT";
    }>>;
    lines: z.ZodArray<z.ZodObject<{
        invoice: z.ZodString;
        amount: z.ZodNumber;
        vendorBank: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare function createTransferOrder(db: Db, raw: z.input<typeof orderInput>): Promise<{
    number: string;
}>;
export {};
