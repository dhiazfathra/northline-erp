import { vendorInput, type PurchaseDownPaymentInput, type PurchaseInvoiceInput, type PurchasePaymentInput } from '@northline/schemas/sales';
import { z } from 'zod';
import type { Db, Tx } from '../db';
export declare function upsertVendor(db: Db, input: z.input<typeof vendorInput>): Promise<void>;
export declare function createPurchaseInvoice(db: Db | Tx, input: PurchaseInvoiceInput): Promise<{
    number: string;
}>;
export declare function deletePurchaseInvoice(db: Db, number: string, idempotencyKey: string): Promise<{
    number: string;
}>;
/** Edited in place under the same number, as Accurate does: taken back and saved again. */
export declare function editPurchaseInvoice(db: Db, number: string, input: PurchaseInvoiceInput): Promise<{
    number: string;
}>;
export declare function createPurchasePayment(db: Db | Tx, input: PurchasePaymentInput): Promise<{
    number: string;
}>;
export declare function deletePurchasePayment(db: Db, number: string, idempotencyKey: string): Promise<{
    number: string;
}>;
/** Edited in place under the same number, as Accurate does: taken back and saved again. */
export declare function editPurchasePayment(db: Db, number: string, input: PurchasePaymentInput): Promise<{
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
export declare const UNBILLED_ACCOUNT = "210203";
/** Penerimaan Barang: unpriced (unlinked) receipts add quantity only; priced receipts also journal to the unbilled account.
 *  shortcut: receipt does not move stock here; stock moves on the invoice (matches the unlinked sandbox case), link receipts to invoices when GRNI is modelled. */
export declare function createReceiveItem(db: Db, input: z.input<typeof orderInput> & {
    receiveNumber: string;
}): Promise<{
    number: string;
}>;
/** Permintaan Barang: no journal, no stock effect. */
export declare function createPurchaseRequisition(db: Db, r: {
    number?: string;
    date: string;
    description?: string;
    lines: {
        item: string;
        qty: number;
        requiredDate?: string;
    }[];
}): Promise<{
    number: string;
}>;
/** Lapor SPT Masa PPN: every taxable sales/purchase invoice with tax date in the period not yet reported joins a new SPT. */
export declare function reportSptMasa(db: Db, from: string, to: string): Promise<{
    id: number;
}>;
/** Harga Pemasok (VPA.yyyy.mm.nnnnn): a vendor's purchase price per item from the date on; no journal. */
export declare function createVendorPrice(db: Db, v: {
    number?: string;
    vendor: string;
    date: string;
    endDate?: string;
    lines: {
        item: string;
        price: number;
    }[];
}): Promise<{
    number: string;
}>;
export {};
