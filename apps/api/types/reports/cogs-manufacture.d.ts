import type { Db } from '../db';
export interface CostMove {
    date: string;
    docType: string;
    docNumber: string;
    item: string;
    value: number;
}
export declare function loadCostMoves(db: Db, from: string, to: string): Promise<CostMove[]>;
/** Pembelian (HPP): purchase invoices and purchase returns. */
export declare const purchaseCogsManufacture: (moves: CostMove[]) => string[][];
/** Penyesuaian Bahan (HPP): every other stock movement (adjustments, sales, job costing). */
export declare const adjustmentCogsManufacture: (moves: CostMove[]) => string[][];
