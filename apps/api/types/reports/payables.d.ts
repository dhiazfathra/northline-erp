import { type SalesData } from './receivables';
/** Faktur Belum Lunas (Utang): column header before the currency line; vendor name rows carry no "Sisa Kredit". */
export declare function outstandingPurchases(d: SalesData, asOf: string): string[][];
/** Umur Utang: no currency column and no credit column; one total row. */
export declare function agingPayable(d: SalesData, asOf: string): string[][];
/** Pembelian per Pemasok */
export declare function purchaseByVendor(d: SalesData, from: string, to: string): string[][];
