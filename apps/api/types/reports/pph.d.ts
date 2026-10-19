import type { Db } from '../db';
export interface PphLine {
    side: 'SALES' | 'PURCHASE';
    date: string;
    type: string;
    party: string;
    doc: string;
    invoice: string;
    bill: string;
    slip: string;
    dpp: number;
    rate: number;
    amount: number;
}
export declare function loadPphLines(db: Db): Promise<PphLine[]>;
/** Daftar Bukti Potong PPh Penjualan (SalesReceiptPPhReport): slips received on sales receipts, invoice = No. Faktur Penjualan. */
export declare const salesReceiptPph: (ls: PphLine[], from: string, to: string) => string[][];
/** Daftar Bukti Potong PPh Pembelian (PurchasePaymentPPhReport): slips issued on purchase payments, invoice = the vendor's No. Faktur. */
export declare const purchasePaymentPph: (ls: PphLine[], from: string, to: string) => string[][];
/** Pembayaran PPh Pembelian (PurchaseInvoicePphPaidReport): PPh withheld per invoice and payment form. Bayar PPh is always 0:
 * depositing the PPh to the tax office (NTPN) is not modelled. */
export declare const purchaseInvoicePphPaid: (ls: PphLine[], from: string, to: string) => string[][];
