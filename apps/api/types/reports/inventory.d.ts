export interface StockMove {
    item: string;
    date: string;
    docType: string;
    docNumber: string;
    party: string;
    quantity: number;
    value: number;
    warehouse?: string;
    description?: string;
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
/** Mutasi per Barang: per selected item, a block per warehouse it ever touched (transit included), by warehouse name. */
export declare function itemMutationByWarehouse(d: InventoryData, itemNos: string[], from: string, to: string): string[][];
/** Mutasi per Gudang (selected warehouses): items with movements, then the warehouse in/out totals. */
export declare function warehouseMutationByItem(d: InventoryData, from: string, to: string, warehouses?: string[]): string[][];
/** Ringkasan Mutasi Gudang: per selected warehouse (by name), items with movements: opening, in, out, closing; warehouse totals. */
export declare function warehouseMutationSummary(d: InventoryData, from: string, to: string, warehouses?: string[]): string[][];
/** Kuantitas Barang per Gudang: per warehouse quantity and value; an item's value is split across warehouses by quantity. */
export declare function quantityByWarehouse(d: InventoryData, asOf: string, warehouses?: string[]): string[][];
/** Umur Persediaan per Gudang: as Umur Persediaan with the warehouse name column. */
export declare function inventoryAgingByWarehouse(d: InventoryData, asOf: string): string[][];
/** Ringkasan Pemindahan Barang */
export declare function transferList(ts: {
    number: string;
    date: string;
    direction: 'OUT' | 'IN';
    warehouse: string;
    reference: string;
}[], from: string, to: string): string[][];
/** Penyesuaian Stok Barang: one block per adjustment (title lines repeat). */
export declare function adjustmentDetail(adjs: {
    number: string;
    date: string;
    description: string;
    lines: {
        item: string;
        name: string;
        unit: string;
        qty: number;
    }[];
}[], from: string, to: string): string[][];
