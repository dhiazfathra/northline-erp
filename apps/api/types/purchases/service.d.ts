import { vendorInput, type PurchaseDownPaymentInput, type PurchaseInvoiceInput, type PurchasePaymentInput } from '@northline/schemas/sales';
import type { z } from 'zod';
import type { Db } from '../db';
export declare function upsertVendor(db: Db, input: z.input<typeof vendorInput>): Promise<void>;
export declare function createPurchaseInvoice(db: Db, input: PurchaseInvoiceInput): Promise<{
    number: string;
}>;
export declare function createPurchasePayment(db: Db, input: PurchasePaymentInput): Promise<{
    number: string;
}>;
export declare function createPurchaseDownPayment(db: Db, input: PurchaseDownPaymentInput): Promise<{
    number: string;
}>;
