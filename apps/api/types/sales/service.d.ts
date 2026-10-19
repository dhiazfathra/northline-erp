import { customerInput, itemInput, type SalesDownPaymentInput, type SalesInvoiceInput, type SalesReceiptInput } from '@northline/schemas/sales';
import type { z } from 'zod';
import type { Db, Tx } from '../db';
export declare function upsertCustomer(db: Db, input: z.input<typeof customerInput>): Promise<void>;
export declare function upsertItem(db: Db, input: z.input<typeof itemInput>): Promise<void>;
/** Deletes a customer or item no document uses, logged under its name (a customer: Pelanggan, then Kontak — Accurate's order). */
export declare function deleteMaster(db: Db, kind: 'customer' | 'item', no: string): Promise<void>;
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
/** `db` may be a transaction (edits re-create the invoice inside theirs); `action` is what Log Aktifitas records. */
export declare function createSalesInvoice(db: Db | Tx, input: SalesInvoiceInput, action?: 'CREATE' | 'UPDATE'): Promise<{
    number: string;
}>;
export declare function deleteSalesInvoice(db: Db, number: string, idempotencyKey: string): Promise<{
    number: string;
}>;
/** Accurate edits an invoice in place: the old one is taken back and the new content saved, under the new number if one is given. */
export declare function editSalesInvoice(db: Db, number: string, input: SalesInvoiceInput): Promise<{
    number: string;
}>;
export declare function createSalesReceipt(db: Db, input: SalesReceiptInput): Promise<{
    number: string;
}>;
export declare function createSalesDownPayment(db: Db, input: SalesDownPaymentInput): Promise<{
    number: string;
}>;
type OrderLine = {
    item: string;
    qty: number;
    price: number;
};
/** Penawaran Penjualan: no journal (ADR-0027). */
export declare function createSalesQuotation(db: Db, q: {
    number?: string;
    customer: string;
    date: string;
    description?: string;
    lines: OrderLine[];
}): Promise<{
    number: string;
}>;
/** Pesanan Penjualan: no journal. A line may take a quotation line (Penawaran → Pesanan), which then counts as processed. */
export declare function createSalesOrder(db: Db, o: {
    number?: string;
    customer: string;
    date: string;
    description?: string;
    lines: (OrderLine & {
        quotation?: {
            number: string;
            seq: number;
        };
    })[];
}): Promise<{
    number: string;
}>;
/** Pengiriman Pesanan: stock leaves at FIFO cost into the delivered-goods account (Dr Persediaan Terkirim / Cr Persediaan). */
export declare function createDeliveryOrder(db: Db, d: {
    idempotencyKey: string;
    number?: string;
    customer: string;
    order?: string;
    date: string;
    description?: string;
    lines: {
        item: string;
        qty: number;
    }[];
}): Promise<{
    number: string;
}>;
/** Tukar Faktur: bundles invoices for collection; no journal. */
export declare function createExchangeInvoice(db: Db, x: {
    number?: string;
    date: string;
    collectDate: string;
    dueDate: string;
    description?: string;
    invoices: string[];
}): Promise<{
    number: string;
}>;
export {};
