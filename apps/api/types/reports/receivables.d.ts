export interface InvoiceLine {
    item: string;
    itemName: string;
    unit: string;
    qty: number;
    price: number;
    total: number;
}
export interface Invoice {
    number: string;
    customer: string;
    date: string;
    dueDate: string;
    description: string;
    total: number;
    lines?: InvoiceLine[]; /** vendor's own number (purchases) */
    bill?: string;
}
export interface Receipt {
    number: string;
    customer: string;
    bankName?: string;
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
    labels?: Labels;
}
/** Words that differ between the receivable (Piutang) and payable (Utang) versions of the same report. */
export interface Labels {
    party: string;
    partyName: string;
    balance: string;
    invoice: string;
    payment: string;
    docNo: string;
    sales: string;
    historyValue: string;
}
export declare const AR: Labels;
export declare const AP: Labels;
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
export declare const BUCKETS: string[];
export declare function openInvoices(d: SalesData, asOf: string, customer: string): {
    number: string;
    customer: string;
    date: string;
    dueDate: string;
    description: string;
    total: number;
    lines?: InvoiceLine[]; /** vendor's own number (purchases) */
    bill?: string;
    owing: number;
    age: number;
}[];
export declare const spread: (xs: {
    owing: number;
    age: number;
}[]) => number[];
/** Umur Piutang: one row per customer with an open balance; totals per customer list and currency. */
export declare function agingReceivable(d: SalesData, asOf: string): string[][];
/** Rincian Umur Piutang */
export declare function agingReceivableDetail(d: SalesData, asOf: string): string[][];
/** Rincian Buku Besar Pembantu Piutang: per customer, opening, then documents grouped by type with subtotals. */
export declare function arLedgerDetail(d: SalesData, from: string, to: string): string[][];
/** Pembayaran Faktur: per customer, per invoice paid in the range, the receipts that paid it. */
export declare function salesInvoicePaid(d: SalesData, from: string, to: string): string[][];
/** Rincian Penerimaan Penjualan: one block per receipt (date order); the amount after "Nilai Pembayaran :" is not printed by Accurate. */
export declare function salesReceiptDetail(d: SalesData, from: string, to: string): string[][];
/** Faktur Belum Lunas per Pelanggan */
export declare function outstandingPerCustomer(d: SalesData, asOf: string): string[][];
/** Rata-rata Pembayaran Pelanggan: invoices settled by a receipt in the range; average days from invoice to settlement. */
export declare function owingCollection(d: SalesData, from: string, to: string): string[][];
/** Penjualan per Barang */
export declare function salesByItem(d: SalesData, from: string, to: string): string[][];
/** Penjualan Barang per Pelanggan: item, then its customers (item name printed on the first customer row). */
export declare function salesItemByCustomer(d: SalesData, from: string, to: string): string[][];
/** Penjualan Pelanggan per Barang */
export declare function salesCustomerByItem(d: SalesData, from: string, to: string): string[][];
/** Rincian Penjualan per Pelanggan */
export declare function salesByCustomerDetail(d: SalesData, from: string, to: string): string[][];
/** Rincian Penjualan per Barang */
export declare function salesByItemDetail(d: SalesData, from: string, to: string): string[][];
/** Penjualan per Cabang */
export declare function salesByBranch(d: SalesData, from: string, to: string): string[][];
/** Rincian Faktur Penjualan: one block per invoice; lines print the item master name. */
export declare function salesInvoiceDetail(d: SalesData, from: string, to: string): string[][];
/** Daftar Pelanggan / Daftar Pemasok: by number under the category; balance as "IDR <amount>" at asOf.
 *  The customer list also prints the creation timestamp (`createdAt`, formatted `dd Mon yyyy HH:mm:ss`). */
export declare function partyList(d: SalesData, asOf: string, createdAt?: Map<string, string>): string[][];
/** Histori Proses Penjualan / Pembelian: one row per invoice in range with the payment documents that settle it ("-" when none). */
export declare function flowHistory(d: SalesData, from: string, to: string, sales: boolean): string[][];
/** Barang Paling Laku: per item, number of invoices containing it, quantity and value. */
export declare function sellingItemFrequency(d: SalesData, from: string, to: string): string[][];
/** Profitabilitas per Faktur: sales − cost of goods (0 for services) − extra costs. */
export declare function profitabilityByInvoice(d: SalesData, from: string, to: string, cogs?: (invoice: string) => number): string[][];
/** Profitabilitas per Pelanggan: per customer with invoices in range: sales, cost of goods, margin; total. */
export declare function profitabilityByCustomer(d: SalesData, from: string, to: string, cogs?: (invoice: string) => number): string[][];
