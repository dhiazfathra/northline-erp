import { vendorInput, type PurchaseDownPaymentInput, type PurchaseInvoiceInput, type PurchasePaymentInput } from '@northline/schemas/sales';
import { z } from 'zod';
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
declare const orderInput: z.ZodObject<{
    number: z.ZodOptional<z.ZodString>;
    vendor: z.ZodString;
    date: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    lines: z.ZodArray<z.ZodObject<{
        item: z.ZodString;
        qty: z.ZodNumber;
        price: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/** Pesanan Pembelian: no journal. */
export declare function createPurchaseOrder(db: Db, input: z.input<typeof orderInput>): Promise<{
    number: string;
}>;
/** Penerimaan Barang: quantities only; stock value arrives with the purchase invoice.
 *  shortcut: receipt does not move stock here; stock moves on the invoice (matches the unlinked sandbox case), link receipts to invoices when GRNI is modelled. */
export declare function createReceiveItem(db: Db, input: z.input<typeof orderInput> & {
    receiveNumber: string;
}): Promise<{
    number: string;
}>;
export {};
