export interface InvoiceLine {
    item: string;
    itemName: string;
    unit: string;
    qty: number;
    price: number;
    total: number; /** item type (SERVICE / INVENTORY / NON_INVENTORY) */
    type?: string;
}
export interface Invoice {
    number: string;
    customer: string;
    date: string;
    dueDate: string;
    description: string;
    total: number; /** invoice discount (cents) */
    discount?: number;
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
/** Age from the due date (Manufaktur/Retail Demo) or the invoice date (Trade Portal Demo preference, ADR-0029 finding 7). */
export type AgingBasis = 'DUE_DATE' | 'INVOICE_DATE';
export declare function openInvoices(d: SalesData, asOf: string, customer: string, basis?: AgingBasis): {
    number: string;
    customer: string;
    date: string;
    dueDate: string;
    description: string;
    total: number; /** invoice discount (cents) */
    discount?: number;
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
export declare function agingReceivable(d: SalesData, asOf: string, basis?: AgingBasis): string[][];
/** Rincian Umur Piutang */
export declare function agingReceivableDetail(d: SalesData, asOf: string, basis?: AgingBasis): string[][];
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
/**
 * Grafik Penjualan (unlabeled line chart, ADR-0011): one point per month with invoices, plotted on the month's first day,
 * value = that month's sales, the series monthlySalesChart verifies against the labeled Grafik Penjualan Bulanan.
 */
export declare function salesInvoiceChartPoints(d: SalesData, from: string, to: string): {
    date: string;
    value: number;
}[];
/** Porsi Penjualan per Pelanggan */
export declare const customerShareChart: (d: SalesData, from: string, to: string) => string[];
/** Porsi Penjualan per Barang */
export declare const itemShareChart: (d: SalesData, from: string, to: string) => string[];
/** Grafik Umur Piutang/Utang: one bar per non-empty age bucket (open balance at asOf). */
export declare function agingChart(d: SalesData, asOf: string, basis?: AgingBasis): [string, string][];
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
/**
 * Sales lines for the item views: invoice lines at DPP (line total less its pro-rata share of the invoice discount, no PPN)
 * and sales-return lines negative, dated in [from, to] (fixtures/sales-views.json: T19 Penjualan 2.041.250 = sum of DPPs).
 */
export declare function itemSales(d: SalesData, from: string, to: string): {
    line: InvoiceLine;
    qty: number;
    value: number;
}[];
/** Penjualan Barang per Gudang: stock items only (services have no warehouse); every line from the default warehouse. */
export declare function salesItemByWarehouse(d: SalesData, from: string, to: string): string[][];
/** Penjualan Barang per Cabang: every item incl. services, one branch column (Kantor Pusat) plus the all-branch total. */
export declare function salesItemByBranch(d: SalesData, from: string, to: string): string[][];
/** Penjualan per Merek: one row per brand; the ERP has no brands, so all sales fall in the blank brand (its name cell drops out). */
export declare function salesByBrand(d: SalesData, from: string, to: string): string[][];
/**
 * Limit Piutang Pelanggan (docs/reports/CustomerLimitReport.md): customers with a credit limit, in the default category
 * block "Umum". Saldo = current receivable over all dates (a cheque receipt already reduces it), printed per currency
 * ("IDR 444.000, USD 0"; a zero balance prints only "IDR 0"). Giro Mundur = the customer's cheques not yet due.
 * Sisa Limit = limit - saldo - open orders - giro mundur.
 */
export declare function customerLimit(d: SalesData, limits: Map<string, number>, currencies: string[], giro?: Map<string, number>): string[][];
/**
 * Sisa Kredit Pelanggan (docs/reports/CustomerExistingCreditListReport.md): customers with unused credit as of the date.
 * Credit = receipts above the invoices they pay (kelebihan bayar); nothing in the ERP consumes credit yet.
 */
export declare function customerCredit(d: SalesData, asOf: string): string[][];
export interface Installment {
    customer: string;
    invoice: string;
    name: string;
    date: string;
    amount: number;
    paid: number;
    paidDate?: string;
}
/**
 * Cicilan Belum Terbayar: installments due on or before the date that are still unpaid now (payment status is current,
 * not as-of: an installment paid on 12 Dec is gone even as of 11 Dec). Bayar = paid so far; Tanggal Bayar blank.
 */
export declare function unpaidInstallments(d: SalesData, is: Installment[], asOf: string): string[][];
/** Pembayaran Cicilan: installment payments whose receipt date is in range, with the receipt date as Tanggal Bayar. */
export declare function paidInstallments(d: SalesData, is: Installment[], from: string, to: string): string[][];
/**
 * Laba/Rugi Terealisasi (docs/reports/RealizeGainLossReport.md): foreign receipts dated in the window, grouped by currency
 * then document type. Bayar (Kurs Faktur) = payment at the invoice rate, Bayar (Kurs Cek) = at the receipt rate,
 * Untung/Rugi = the difference; a subtotal row per type and per currency.
 */
export declare function realizedGainLoss(lines: {
    receipt: string;
    date: string;
    currency: string;
    atInvoice: number;
    atReceipt: number;
}[], from: string, to: string): string[][];
export interface ForeignOpen {
    account: string;
    accountName: string;
    currency: string;
    foreign: number;
    domestic: number;
}
/**
 * Open foreign receivables at a month end, per AR account: foreign = sum of (IDR owing / invoice rate), domestic = IDR owing; both in cents.
 * Used by the month-end revaluation and Laba/Rugi Tidak Terealisasi.
 */
export declare function foreignOpenReceivables(invoices: {
    account: string;
    accountName: string;
    currency: string;
    rate: number;
    owing: number;
}[]): ForeignOpen[];
/** Laba/Rugi Tidak Terealisasi (docs/reports/UnRealizeGainLossReport.md): one row per revalued account and month, then a total row. */
export declare function unrealizedGainLoss(months: {
    month: string;
    rates: Record<string, number>;
    open: ForeignOpen[];
}[]): string[][];
