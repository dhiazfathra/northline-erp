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
/**
 * Daftar Barang dan Jasa (docs/reports/ItemListReport.md): items grouped by category in creation order, quantity on hand in
 * all warehouses as of the date. The ERP has no item categories or default selling prices yet: every item is in Accurate's
 * default category "Umum" with price 0, as the NL fixture items are.
 */
export declare function itemList(items: {
    no: string;
    name: string;
    type: string;
}[], moves: {
    item: string;
    date: string;
    quantity: number;
}[], asOf: string): string[][];
/**
 * Pergerakan Stok per Barang (docs/reports/StockMovementByWarehouseReport.md): one warehouse; per item with a move in the
 * window: opening, Penjualan, Pembelian, Produksi, Pemindahan, Penyesuaian, Lainnya, closing (signed quantities).
 */
export declare function stockMovementByWarehouse(d: InventoryData, warehouse: string, from: string, to: string): string[][];
/**
 * Lembar Penghitungan Stok (docs/reports/PhysicalInventoryCountSheetReport.md): like Daftar Barang dan Jasa (category
 * blocks, creation order, all items) with the quantity in one warehouse as of the date and the unit; the two "Hitung"
 * columns are blank for writing in, so their cells drop out of each row.
 */
export declare function countSheet(items: {
    no: string;
    name: string;
    unit: string;
}[], moves: {
    item: string;
    date: string;
    quantity: number;
    warehouse?: string;
}[], warehouse: string, asOf: string): string[][];
/**
 * Analisa Nilai Persediaan (docs/reports/AnalysisInventoryValuationReport.md): every stock item (name order), all
 * warehouses: opening, Penjualan, Pembelian, Produksi, Penyesuaian, Lainnya, closing, each as quantity and FIFO value.
 * Columns as in Pergerakan Stok (returns with their side); transfers fall under Lainnya and net to zero over all warehouses.
 */
export declare function analysisValuation(d: InventoryData, from: string, to: string): string[][];
/**
 * Ketersediaan Stok Penjualan (docs/reports/InventoryAnalysisReport.md): stock items in category blocks (creation order,
 * as Daftar Barang). Stok Gudang = all warehouses as of the date; Dipesan = quantity on open purchase orders dated by
 * then; Stok dapat dijual = Stok Gudang (Accurate does not add or subtract the orders).
 * Jual/Minggu: sales invoices less sales returns dated in the last 3 calendar months (asOf minus 3 months, inclusive),
 * divided by weeks = floor(days from the first invoice in that window to asOf / 7) + 1; 0 without an invoice in the
 * window. Delivery orders do not count; a delivered invoice counts on its own date. Two decimals, zeros dropped.
 */
export interface ItemSale {
    item: string;
    date: string;
    qty: number;
}
export declare function inventoryAnalysis(items: {
    no: string;
    name: string;
    type: string;
    unit: string;
}[], moves: {
    item: string;
    date: string;
    quantity: number;
}[], sales: ItemSale[], onOrder: {
    item: string;
    date: string;
    qty: number;
}[], asOf: string): string[][];
/**
 * Rincian Umur Persediaan (docs/reports/InventoryAgingDetailReport.md): one item in one warehouse. Every incoming move
 * (purchase, receipt, sales return, adjustment in) opens a FIFO layer; outgoing moves consume the oldest layers. Remaining
 * layers are aged at the as-of date: 1 - 30, 31 - 60, 61 - 90, 91 - 120, > 120 days; last row = bucket totals.
 */
export declare function inventoryAgingDetail(d: InventoryData, item: string, warehouse: string, asOf: string): string[][];
/**
 * Rincian Ketersediaan Stok Penjualan (docs/reports/InventoryAnalysisDetailReport.md): one item; Dipesan = its open
 * purchase-order lines dated by the as-of date (Tgl Estimasi = order date, Nama Referensi = vendor). With no open
 * line Accurate prints the labels with empty values.
 */
export declare function inventoryAnalysisDetail(d: InventoryData, orders: {
    number: string;
    date: string;
    vendorName: string;
    qty: number;
    item: string;
}[], item: string, asOf: string): string[][];
/** Barang Grup (docs/reports/ItemGroupDetailReport.md): one block per group item (creation order), components in entry order. */
export declare function itemGroupDetail(groups: {
    no: string;
    name: string;
    unit: string;
    components: {
        no: string;
        name: string;
        qty: number;
        unit: string;
    }[];
}[]): string[][];
/**
 * Rincian Nilai Persediaan (CSV) (docs/reports/InventoryValuationDetailDownloadReport.md): one file per item. An opening
 * row (no number, dated the day before the start) carries quantity and value in; then each move in the window with the
 * running quantity and value. Values are plain rupiah.
 */
export declare function inventoryValuationCsv(moves: StockMove[], item: string, from: string, to: string): string[][];
/**
 * Selisih Saldo Akun Persediaan dengan Nilai Barang (docs/reports/ItemValueToAccountBalanceDifferenceReport.md): balances
 * of the inventory accounts at the end date against the stock value of all items at that date; the difference should be 0.
 */
export declare function itemValueDifference(accounts: {
    no: string;
    name: string;
    balance: number;
}[], itemValue: number): string[][];
export interface Warehouse {
    name: string;
    description: string;
    street: string;
    city: string;
    province: string;
    zipCode: string;
    country: string;
}
export interface Transfer {
    number: string;
    date: string;
    direction: 'OUT' | 'IN';
    warehouse: string;
    reference: string;
    from?: string;
    lines: {
        item: string;
        itemName: string;
        unit: string;
        qty: number;
    }[];
}
/** Address lines joined without separators: street lines, "city province zip", country. */
export declare const fullAddress: (w?: Warehouse) => string;
/** Daftar Gudang: every warehouse by name, the transit warehouse included; blank cells drop. */
export declare function warehouseList(ws: Warehouse[]): string[][];
/** Rincian Pemindahan Barang: one page per transfer (number order); label cells and their values print one per row. */
export declare function transferDetail(ts: Transfer[], ws: Warehouse[], from: string, to: string): string[][];
/** Barang Diterima Sebagian: sends with some but not all quantity received; every line prints with Kts Diterima and Sisa. */
export declare function uncompletedTransfers(ts: Transfer[], from: string, to: string): string[][];
/** Perbedaan Persediaan Terkirim Pemindahan Barang: transfers whose goods-in-transit journal differs between send and receipt.
 *  Transfers carry no value in this ERP (and Retail Demo posted no journal for the 2045 transfers), so no transfer can differ. */
export declare const transitDifference: (asOf: string) => string[][];
