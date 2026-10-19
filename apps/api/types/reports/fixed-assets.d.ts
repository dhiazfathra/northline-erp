export interface Asset {
    number: string;
    description: string;
    category: string;
    date: string;
    usageDate: string;
    lifeMonths: number;
    cost: number;
    expenseAccount: string;
    accumulatedAccount: string;
    expenditures: {
        name: string;
        date: string;
        amount: number;
    }[];
    depreciations: {
        period: string;
        date: string;
        jvNumber: string;
        periodEndNumber: string;
        amount: number;
    }[];
    disposal?: {
        number: string;
        date: string;
        description: string;
        gainLossName: string;
        sold: boolean;
        price: number;
        sellingName: string;
    };
    fiscalLifeMonths?: number;
    edits?: {
        number: string;
        date: string;
        description: string;
        oldLifeMonths: number;
        newLifeMonths: number;
    }[];
}
/** Daftar Aset Tetap: grouped by tangibility ("Berwujud"; intangible assets not modelled), cost, depreciation to date, book value; totals. */
export declare function fixedAssetList(assets: Asset[], asOf: string): string[][];
/** Aset Tetap per Kategori: as the list plus depreciation of the current year. */
export declare function fixedAssetByCategory(assets: Asset[], asOf: string): string[][];
/** Histori Aset for one asset: acquisition and each depreciation with running book value. */
export declare function fixedAssetHistory(a: Asset, from: string, to: string): string[][];
/** Jurnal Aset for one asset: its depreciation journal lines (the acquisition journal is not listed). */
export declare function fixedAssetJournal(a: Asset): string[][];
/** Detail Aset Tetap for one asset: its expenditures. */
export declare function fixedAssetDetail(a: Asset): string[][];
/** Daftar Disposisi Aset Tetap */
export declare function disposedList(assets: Asset[], from: string, to: string): string[][];
/** Histori Lokasi Aset: acquisition (+1) and disposal (-1) at the asset's location; Alamat Asal empty (trailing cell dropped). */
export declare function assetLocationHistory(a: Asset): string[][];
/**
 * Histori Perubahan Aset: disposals (and asset edits, not modelled) dated in the window. Keterangan is generated:
 * "Disposisi 1, dijual senilai <price, en-US grouping>"; the asset columns show its data after the change.
 */
export declare function fixedAssetEditedHistory(a: Asset, from: string, to: string): string[][];
/** Daftar Perubahan Aset Tetap: asset edits dated in the window (disposals are not listed); Tipe "Data", Pengeluaran empty. */
export declare function fixedAssetEditedList(assets: Asset[], from: string, to: string): string[][];
/**
 * Perbedaan Penyusutan (docs/reports/DifferentIntermDepreciationReport.md), per fiscal asset up to `year`: per calendar
 * year the months in use (from the acquisition month), fiscal (PPh) = cost / fiscal life x months, accounting = cost /
 * life x months, Koreksi Pajak = PPh - accounting. Rows stop at the year the fiscal life ends.
 */
export declare function differentDepreciation(assets: Asset[], year: number): string[][];
