import { customerInput, itemInput, type SalesInvoiceInput, type SalesReceiptInput } from '@northline/schemas/sales';
import type { z } from 'zod';
import type { Db, Tx } from '../db';
export declare function upsertCustomer(db: Db, input: z.input<typeof customerInput>): Promise<void>;
export declare function upsertItem(db: Db, input: z.input<typeof itemInput>): Promise<void>;
export declare function nextNumber(tx: Tx, prefix: string): Promise<string>;
export declare const period: (date: string) => string;
/** Credit/debit lines merged per account, in order of first appearance (Accurate prints one line per account). */
export declare function merge(lines: {
    account: string;
    amount: number;
}[]): {
    account: string;
    amount: number;
}[];
export declare function createSalesInvoice(db: Db, input: SalesInvoiceInput): Promise<{
    number: string;
}>;
export declare function createSalesReceipt(db: Db, input: SalesReceiptInput): Promise<{
    number: string;
}>;
