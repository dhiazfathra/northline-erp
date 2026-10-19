export interface SerialMove {
    item: string;
    itemName: string;
    serial: string;
    date: string;
    docType: string;
    quantity: number;
    warehouse: string;
    docNumber?: string;
    description?: string;
    expiry?: string;
}
/** Mutasi Nomor Seri/Produksi (docs/reports/ReceivedDeliveredSerialNumberReport.md): moves of one item in the window. */
export declare function receivedDeliveredSerials(ms: SerialMove[], item: string, from: string, to: string): string[][];
/** Umur Nomor Seri/Batch (docs/reports/SerialNumberAgingDetailReport.md): serials on hand in a warehouse, aged from their receipt date. */
export declare function serialAging(ms: SerialMove[], item: string, warehouse: string, asOf: string): string[][];
/** Sisa Umur Per Nomor Produksi (docs/reports/RemainingAgeSerialNumberDetailReport.md): remaining shelf life to the expiry date. */
export declare function remainingAgeSerials(ms: SerialMove[], item: string, asOf: string): string[][];
/** Stok Nomor Seri/Produksi: per selected item, every serial with stock in any warehouse (transit included). Sisa Hari = expiry - as-of. */
export declare function serialStock(ms: SerialMove[], items: string[], asOf: string): string[][];
/** … per Gudang: per item, a warehouse row (name order, transit included), its serials, then a quantity subtotal. */
export declare function serialStockPerWarehouse(ms: SerialMove[], items: string[], asOf: string): string[][];
/** … per Barang: per selected warehouse (name order), per item (name order), its serials, then a quantity subtotal. */
export declare function serialStockPerItem(ms: SerialMove[], warehouses: string[], asOf: string): string[][];
/** Histori Nomor Seri/Produksi: one titled block per selected serial; every warehouse leg is a row (a transfer prints out then in),
 *  Saldo runs over all warehouses, then Masuk/Keluar totals. */
export declare function serialMutation(ms: SerialMove[], serials: {
    item: string;
    serial: string;
}[]): string[][];
/** Nomor Produksi Segera Kadaluarsa: serials whose expiry falls in [from, to] with stock on hand; Sisa Hari counts whole days from the
 *  print moment `now` (Asia/Jakarta) to the expiry midnight, so a print after 00:00 is one less than the calendar difference. */
export declare function serialExpiredSoon(ms: SerialMove[], from: string, to: string, now: string): string[][];
