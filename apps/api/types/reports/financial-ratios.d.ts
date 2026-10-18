import type { StatementLine } from './financial-statements';
export interface BsTotals {
    cash: number;
    receivable: number;
    inventory: number;
    currentAssets: number;
    fixedAssets: number;
    assets: number;
    payable: number;
    currentLiabilities: number;
    longTermLiabilities: number;
    equity: number;
}
export interface PlTotals {
    revenue: number;
    cogs: number;
    operating: number;
    net: number;
}
/** One ratio column: balances at the start and end of the period, P&L for the period. */
export interface RatioInput {
    start: BsTotals;
    end: BsTotals;
    pl: PlTotals;
}
/** `current` and `previous` are the report period and the one before it (previous month, or previous year). */
export declare function financialRatios(current: RatioInput, previous: RatioInput, monthly: boolean): string[][];
/** Totals from our own Neraca (Standar) lines, in rupiah. */
export declare const bsTotals: (l: StatementLine[]) => BsTotals;
/** Totals from our own Laba/Rugi (Standar) lines, in rupiah. */
export declare const plTotals: (l: StatementLine[]) => PlTotals;
/** Per period end: Total Aset, Total Kewajiban, Harta Bersih (Grafik Harta Bersih). */
export declare const netWorthChart: (ends: BsTotals[]) => {
    'Total Aset': string[];
    'Total Kewajiban': string[];
    'Harta Bersih': string[];
};
/** Grafik Rasio Likuiditas: cash and trade payables at each period end. */
export declare const liquidityChart: (ends: BsTotals[]) => {
    'Kas & Bank': string[];
    'Utang Usaha': string[];
};
/** Grafik Pengembalian Aset: the period's net income beside closing assets. */
export declare const returnOnAssetChart: (ends: BsTotals[], pls: PlTotals[]) => {
    'Laba/Rugi': string[];
    'Total Aset': string[];
};
/** Grafik Pengembalian pada Modal: the period's net income beside closing equity. */
export declare const returnOnEquityChart: (ends: BsTotals[], pls: PlTotals[]) => {
    'Laba/Rugi': string[];
    'Harta Bersih': string[];
};
/** Grafik Pendapatan berbanding Biaya: per period, revenue (incl. other income) and costs (COGS, expenses, other expenses). */
export declare const revenueVsExpenseChart: (pls: {
    revenue: number;
    expense: number;
}[]) => {
    'Total Pendapatan': string[];
    'Total Biaya': string[];
};
