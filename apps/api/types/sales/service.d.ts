import { customerInput, itemInput, type SalesInvoiceInput, type SalesReceiptInput } from '@northline/schemas/sales';
import type { z } from 'zod';
import type { Db } from '../db';
export declare function upsertCustomer(db: Db, input: z.input<typeof customerInput>): Promise<void>;
export declare function upsertItem(db: Db, input: z.input<typeof itemInput>): Promise<void>;
export declare function createSalesInvoice(db: Db, input: SalesInvoiceInput): Promise<{
    number: string;
}>;
export declare function createSalesReceipt(db: Db, input: SalesReceiptInput): Promise<{
    number: string;
}>;
