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
/** Mutasi per Barang: per selected item, its movements under each warehouse. */
export declare function itemMutationByWarehouse(d: InventoryData, itemNos: string[], from: string, to: string): string[][];
/** Mutasi per Gudang: per warehouse, every item with movements; warehouse total of in/out last. */
export declare function warehouseMutationByItem(d: InventoryData, from: string, to: string): string[][];
/** Ringkasan Mutasi Gudang: per item with movements: opening, in, out, closing quantity; totals. */
export declare function warehouseMutationSummary(d: InventoryData, from: string, to: string): string[][];
/** Kuantitas Barang per Gudang: quantity and FIFO value per item, per warehouse and total. */
export declare function quantityByWarehouse(d: InventoryData, asOf: string): string[][];
/** Umur Persediaan per Gudang: as Umur Persediaan with the warehouse name column. */
export declare function inventoryAgingByWarehouse(d: InventoryData, asOf: string): string[][];
