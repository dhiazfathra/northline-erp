export interface StockMove {
    item: string;
    date: string;
    docType: string;
    docNumber: string;
    party: string;
    quantity: number;
    value: number;
}
export interface StockItem {
    no: string;
    name: string;
    unit: string;
}
export interface InventoryData {
    items: StockItem[];
    moves: StockMove[];
}
/** Nilai Persediaan: per item by name, opening / in / out / closing quantity and value; total row. */
export declare function inventoryValuation(d: InventoryData, from: string, to: string): string[][];
/** Kartu Stok Persediaan for the selected items. */
export declare function stockCard(d: InventoryData, itemNos: string[], from: string, to: string): string[][];
/** Rincian Nilai Persediaan for the selected items: quantities and FIFO values with running balance. */
export declare function valuationDetail(d: InventoryData, itemNos: string[], from: string, to: string): string[][];
/** Umur Persediaan: remaining FIFO layers by age (days since the layer's purchase date). */
export declare function inventoryAging(d: InventoryData, asOf: string): string[][];
/** Profitabilitas per Barang: sales, FIFO cost of goods sold, margin, for items sold in the range. */
export declare function profitabilityByItem(d: InventoryData, sales: {
    item: string;
    date: string;
    total: number;
}[], from: string, to: string): string[][];
