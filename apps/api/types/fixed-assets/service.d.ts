import { z } from 'zod';
import type { Db } from '../db';
export declare const BULAN: string[];
export declare const fixedAssetInput: z.ZodObject<{
    idempotencyKey: z.ZodString;
    number: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    category: z.ZodString;
    date: z.ZodString;
    usageDate: z.ZodOptional<z.ZodString>;
    lifeMonths: z.ZodNumber;
    assetAccount: z.ZodString;
    accumulatedAccount: z.ZodString;
    expenseAccount: z.ZodString;
    expenditures: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        date: z.ZodString;
        amount: z.ZodPipe<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>, z.ZodTransform<number, string | number>>;
        account: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare function createFixedAsset(db: Db, input: z.input<typeof fixedAssetInput>): Promise<{
    number: string;
}>;
/** Straight-line monthly amount; the last month takes the rounding remainder so the asset ends at zero book value. */
export declare function monthlyDepreciation(cost: number, life: number, monthIndex: number): number;
/** Proses Akhir Bulan (depreciation only): one journal per period, Dr expense / Cr accumulated, merged per account. */
export declare function runPeriodEnd(db: Db, input: {
    idempotencyKey: string;
    period: string;
}): Promise<{
    number: string;
}>;
/** Disposisi Aset Tetap: book value written off to gain/loss, proceeds booked against it as a separate pair (not netted). */
export declare function disposeFixedAsset(db: Db, raw: {
    idempotencyKey: string;
    number?: string;
    asset: string;
    date: string;
    description?: string;
    gainLossAccount: string;
    price?: number;
    sellingAccount?: string;
}): Promise<{
    number: string;
}>;
