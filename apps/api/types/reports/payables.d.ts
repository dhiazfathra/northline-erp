import { type AgingBasis, type SalesData } from './receivables';
/** Faktur Belum Lunas (Utang): column header before the currency line; vendor name rows carry no "Sisa Kredit". */
export declare function outstandingPurchases(d: SalesData, asOf: string, basis?: AgingBasis): string[][];
/** Umur Utang: no currency column and no credit column; one total row. */
export declare function agingPayable(d: SalesData, asOf: string, basis?: AgingBasis): string[][];
/** Pembelian per Pemasok */
export declare function purchaseByVendor(d: SalesData, from: string, to: string): string[][];
/** Faktur Belum Lunas per Pemasok */
export declare function outstandingPerVendor(d: SalesData, asOf: string): string[][];
/** Rincian Umur Utang: the per-vendor subtotal prints the owing and the first five buckets (no "> 120" cell). */
export declare function agingPayableDetail(d: SalesData, asOf: string, basis?: AgingBasis): string[][];
/** Pembelian per Barang */
export declare function purchaseByItem(d: SalesData, from: string, to: string): string[][];
/** Rincian Pembelian per Barang: no subtotal rows. */
export declare function purchaseByItemDetail(d: SalesData, from: string, to: string): string[][];
/** Rincian Pembelian per Pemasok */
export declare function purchaseByVendorDetail(d: SalesData, from: string, to: string): string[][];
/** Rincian Pembayaran Pembelian: per payment; invoices are identified by the vendor's bill number; method "Tunai". */
export declare function purchasePaymentDetail(d: SalesData, from: string, to: string): string[][];
/** Utang per Bulan: opening before the year, net change per month (invoices − payments), closing; totals row. */
export declare function payablePerMonth(d: SalesData, year: number): string[][];
/** Rincian Faktur Pembelian */
export declare function purchaseInvoiceDetail(d: SalesData, from: string, to: string): string[][];
export interface OrderDoc {
    number: string;
    vendor: string;
    date: string;
    total: number;
    lines: {
        item: string;
        itemName: string;
        unit: string;
        qty: number;
        price: number;
        total: number;
    }[];
}
export interface OrderData {
    vendors: Map<string, string>;
    orders: OrderDoc[];
    receipts: OrderDoc[];
}
export declare const orderList: (d: OrderData, f: string, t: string) => string[][];
export declare const orderDetail: (d: OrderData, f: string, t: string) => string[][];
/** Pesanan Pembelian per Barang. shortcut: "Kts Terproses" is 0 (orders are not linked to receipts yet; matches the unlinked sandbox case). */
export declare function orderByItem(d: OrderData, f: string, t: string): string[][];
export declare function orderByVendor(d: OrderData, f: string, t: string): string[][];
/** Daftar Penerimaan Barang; the "Pengiriman" (shipment) column prints nothing when unset. */
export declare const receiveList: (d: OrderData, f: string, t: string) => string[][];
export declare const receiveDetail: (d: OrderData, f: string, t: string) => string[][];
export interface Requisition {
    number: string;
    date: string;
    description: string;
    lines: {
        item: string;
        itemName: string;
        unit: string;
        qty: number;
    }[];
}
export declare const requisitionList: (rs: Requisition[], f: string, t: string) => string[][];
export declare const requisitionDetail: (rs: Requisition[], f: string, t: string) => string[][];
export declare function requisitionByItem(rs: Requisition[], f: string, t: string): string[][];
export declare const requisitionOrderStatus: (rs: Requisition[], f: string, t: string) => string[][];
/**
 * Pembelian per Biaya (docs/reports/PurchaseByExpenseReport.md): Biaya-tab amounts of purchase invoices dated in the
 * window, summed per expense account, ordered by account number; item lines do not count.
 */
export declare function purchaseByExpense(expenses: {
    date: string;
    account: string;
    accountName: string;
    amount: number;
}[], from: string, to: string): string[][];
/**
 * Perubahan Harga Beli Per Barang (docs/reports/VendorPriceHistoryReport.md): per item, its vendor price changes dated by
 * the as-of date, oldest first. Harga Lama = the same vendor's previous price for the item (0 for the first);
 * Tanggal Berakhir is empty (no end date set), so the cell is dropped.
 */
/** Penyesuaian Harga Beli (fixtures/retail/inventory-re.json): one titled block per Harga Pemasok document dated in range, lines in
 *  entry order with the new price in en-US format; a blank Tanggal Berakhir drops its cell. */
export declare function vendorPriceAdjustmentDetail(prices: {
    number: string;
    vendorName: string;
    date: string;
    endDate?: string;
    item: string;
    itemName: string;
    price: number;
}[], from: string, to: string): string[][];
export declare function vendorPriceHistory(prices: {
    number: string;
    vendorName: string;
    date: string;
    item: string;
    itemName: string;
    unit: string;
    price: number;
}[], items: string[], asOf: string): string[][];
