import { type SalesData } from './receivables';
/** Faktur Belum Lunas (Utang): column header before the currency line; vendor name rows carry no "Sisa Kredit". */
export declare function outstandingPurchases(d: SalesData, asOf: string): string[][];
/** Umur Utang: no currency column and no credit column; one total row. */
export declare function agingPayable(d: SalesData, asOf: string): string[][];
/** Pembelian per Pemasok */
export declare function purchaseByVendor(d: SalesData, from: string, to: string): string[][];
/** Faktur Belum Lunas per Pemasok */
export declare function outstandingPerVendor(d: SalesData, asOf: string): string[][];
/** Rincian Umur Utang: the per-vendor subtotal prints the owing and the first five buckets (no "> 120" cell). */
export declare function agingPayableDetail(d: SalesData, asOf: string): string[][];
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
