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
    /** 'DP' = down-payment invoice */ kind?: 'SI' | 'DP'; /** linked delivery / order */
    delivery?: string;
    order?: string;
    exchange?: string; /** down payments deducted on this invoice */
    dpUses?: {
        dp: string;
        amount: number;
    }[];
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
export interface Return {
    number: string;
    customer: string;
    invoice: string;
    date: string;
    description: string;
    total: number;
    lines: InvoiceLine[];
}
export interface SalesData {
    customers: Map<string, string>;
    invoices: Invoice[];
    receipts: Receipt[];
    returns?: Return[];
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
    ret: string;
    dp: string;
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
    /** 'DP' = down-payment invoice */ kind?: 'SI' | 'DP'; /** linked delivery / order */
    delivery?: string;
    order?: string;
    exchange?: string; /** down payments deducted on this invoice */
    dpUses?: {
        dp: string;
        amount: number;
    }[];
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
/** `extra`: unlinked purchase receipts and orders, printed after the invoices (receipts, then orders) in their own stage column. */
export declare function flowHistory(d: SalesData, from: string, to: string, sales: boolean, extra?: {
    receipts: string[];
    orders: string[];
}): string[][];
/** Barang Paling Laku: per item, number of invoices containing it, quantity and value. */
export declare function sellingItemFrequency(d: SalesData, from: string, to: string): string[][];
/** Profitabilitas per Faktur: sales − cost of goods (0 for services) − extra costs. */
export declare function profitabilityByInvoice(d: SalesData, from: string, to: string, cogs?: (invoice: string) => number): string[][];
/** Profitabilitas per Pelanggan: per customer with invoices in range: sales, cost of goods, margin; total. */
export declare function profitabilityByCustomer(d: SalesData, from: string, to: string, cogs?: (invoice: string) => number): string[][];
/** Daftar Retur Penjualan / Pembelian */
export declare function returnList(d: SalesData, from: string, to: string): string[][];
/** Rincian Retur: one block per return. The sales version adds an empty "Nama Biaya :" line; the purchase version does not. */
export declare function returnDetail(d: SalesData, from: string, to: string): string[][];
/** Retur Penjualan/Pembelian per Barang */
export declare function returnByItem(d: SalesData, from: string, to: string): string[][];
/** Grafik Penjualan Bulanan: one bar per month with invoices in range, labelled "<Mon yyyy>" and the amount. */
export declare function monthlySalesChart(d: SalesData, from: string, to: string): [string, string][];
/** Porsi Penjualan per Pelanggan */
export declare const customerShareChart: (d: SalesData, from: string, to: string) => string[];
/** Porsi Penjualan per Barang */
export declare const itemShareChart: (d: SalesData, from: string, to: string) => string[];
/** Grafik Umur Piutang/Utang: one bar per non-empty age bucket (open balance at asOf). */
export declare function agingChart(d: SalesData, asOf: string): [string, string][];
/** Grafik Rata-rata Pembayaran Pelanggan: per month in range, average days from invoice date to each receipt dated that month
 *  (partial payments count); months without receipts show 0. */
export declare function collectionDaysChart(d: SalesData, from: string, to: string): [string, string][];
/** Uang Muka Penjualan per customer: DP invoices in range, used (as of the end date) and remaining. */
export declare function downPaymentsByCustomer(d: SalesData, from: string, to: string): string[][];
/** Penggunaan Uang Muka Penjualan: per DP invoice in range, the invoices that used it. */
export declare function downPaymentUsage(d: SalesData, from: string, to: string): string[][];
export interface Delivery {
    number: string;
    customer: string;
    date: string;
    lines: {
        item: string;
        itemName: string;
        unit: string;
        qty: number;
    }[];
}
/** Daftar Pengiriman Pesanan; "Pengiriman" (shipment) prints nothing when unset. */
export declare const deliveryList: (d: SalesData, ds: Delivery[], f: string, t: string) => string[][];
export declare const deliveryDetail: (d: SalesData, ds: Delivery[], f: string, t: string) => string[][];
/** Status Pengiriman Pesanan: per customer, each delivery with the invoice that billed it. */
export declare function deliveryHistory(d: SalesData, ds: Delivery[], f: string, t: string): string[][];
/** Rincian Tukar Faktur. Umur is days from the invoice due date to `today` (Accurate uses the current date, not the report range). */
export declare function exchangeDetail(d: SalesData, xs: {
    number: string;
    date: string;
    collectDate: string;
    dueDate: string;
    invoices: string[];
}[], from: string, to: string, today: string): string[][];
