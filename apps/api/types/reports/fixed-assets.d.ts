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
