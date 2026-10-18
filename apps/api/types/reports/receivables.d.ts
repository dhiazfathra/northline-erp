export interface Invoice {
    number: string;
    customer: string;
    date: string;
    dueDate: string;
    description: string;
    total: number;
}
export interface Receipt {
    number: string;
    customer: string;
    date: string;
    description: string;
    amount: number;
    payments: {
        invoice: string;
        amount: number;
    }[];
}
export interface SalesData {
    customers: Map<string, string>;
    invoices: Invoice[];
    receipts: Receipt[];
}
/** Daftar Faktur Penjualan */
export declare function salesInvoiceList(d: SalesData, from: string, to: string): string[][];
/** Penjualan per Pelanggan */
export declare function salesByCustomer(d: SalesData, from: string, to: string): string[][];
/** Penerimaan Penjualan: newest first; cheque date = receipt date (no cheque number printed when empty). */
export declare function salesReceiptList(d: SalesData, from: string, to: string): string[][];
/** Buku Besar Pembantu Piutang: customers with movements in the range. */
export declare function arLedger(d: SalesData, from: string, to: string): string[][];
/** Histori Piutang */
export declare function arHistory(d: SalesData, from: string, to: string): string[][];
/** Pernyataan Piutang: one statement per customer (contact fields print empty). */
export declare function customerStatement(d: SalesData, from: string, to: string): string[][];
/** Faktur Belum Lunas: per customer (by name), unpaid invoices at `asOf` with age in days from the due date. */
export declare function outstandingInvoices(d: SalesData, asOf: string): string[][];
